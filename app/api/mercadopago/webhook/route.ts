import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { mpPayment, mpPreApproval } from "@/lib/mercadopago";

// O Mercado Pago manda notificações assíncronas aqui: pagamentos avulsos
// (importante pra Pix e boleto, que não confirmam na hora) e eventos de
// assinatura (cobrança recorrente aprovada, cancelada, pausada).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const type = body?.type ?? req.nextUrl.searchParams.get("type");

    if (type === "subscription_preapproval" || type === "preapproval") {
      await handlePreapproval(body, req);
    } else {
      await handlePayment(body, req);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro no webhook do Mercado Pago:", err);
    return NextResponse.json({ ok: true }); // sempre 200 pra evitar retries agressivos
  }
}

async function handlePayment(body: any, req: NextRequest) {
  const paymentId =
    body?.data?.id ?? req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");
  if (!paymentId) return;

  const result = await mpPayment.get({ id: String(paymentId) });
  const paymentRowId = result.metadata?.payment_row_id as string | undefined;
  if (!paymentRowId) return;

  const status = result.status;
  const dbStatus = status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

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
      .update({ plan_id: paymentRow.plan_id, plan_started_at: new Date().toISOString() })
      .eq("id", paymentRow.user_id);
  }
}

async function handlePreapproval(body: any, req: NextRequest) {
  const preapprovalId =
    body?.data?.id ?? req.nextUrl.searchParams.get("data.id") ?? req.nextUrl.searchParams.get("id");
  if (!preapprovalId) return;

  const result = await mpPreApproval.get({ id: String(preapprovalId) });
  const subRowId = result.external_reference as string | undefined;
  if (!subRowId) return;

  const dbStatus =
    result.status === "authorized" ? "authorized" : result.status === "cancelled" ? "cancelled" : "paused";

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .update({
      mp_preapproval_id: String(result.id),
      status: dbStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subRowId)
    .select("*")
    .single();

  if (!sub) return;

  if (dbStatus === "authorized") {
    await supabaseAdmin
      .from("profiles")
      .update({ plan_id: sub.plan_id, plan_started_at: new Date().toISOString() })
      .eq("id", sub.user_id);
  } else if (dbStatus === "cancelled") {
    const { data: freePlan } = await supabaseAdmin
      .from("plans")
      .select("id")
      .eq("price_cents", 0)
      .limit(1)
      .maybeSingle();
    if (freePlan) {
      await supabaseAdmin
        .from("profiles")
        .update({ plan_id: freePlan.id, plan_started_at: new Date().toISOString() })
        .eq("id", sub.user_id);
    }
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
