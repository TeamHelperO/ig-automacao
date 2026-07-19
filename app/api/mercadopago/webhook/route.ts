import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { mpPayment } from "@/lib/mercadopago";

// O Mercado Pago manda notificações assíncronas aqui (importante pra Pix e
// boleto, que não confirmam na hora, e como reforço mesmo pra cartão).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const paymentId =
      body?.data?.id ?? req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");

    if (!paymentId) return NextResponse.json({ ok: true });

    const result = await mpPayment.get({ id: String(paymentId) });
    const paymentRowId = result.metadata?.payment_row_id as string | undefined;
    if (!paymentRowId) return NextResponse.json({ ok: true });

    const status = result.status;
    const dbStatus =
      status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

    const { data: paymentRow } = await supabaseAdmin
      .from("payments")
      .update({
        mp_payment_id: String(result.id),
        status: dbStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRowId)
      .select("*")
      .single();

    if (dbStatus === "approved" && paymentRow) {
      await supabaseAdmin
        .from("profiles")
        .update({ plan_id: paymentRow.plan_id })
        .eq("id", paymentRow.user_id);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return NextResponse.json({ ok: true }); // sempre 200 pra evitar retries agressivos
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
