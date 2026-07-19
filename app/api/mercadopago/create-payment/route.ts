import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { mpPayment } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json();
  const { plan_id, token, payment_method_id, installments, issuer_id, payer } = body;

  if (!plan_id || !token || !payment_method_id) {
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  }

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("id", plan_id)
    .eq("active", true)
    .maybeSingle();

  if (!plan) return NextResponse.json({ error: "plano não encontrado" }, { status: 404 });

  // registro em 'pending' antes de chamar a API, pra sempre termos rastro
  const { data: paymentRow, error: insertError } = await supabaseAdmin
    .from("payments")
    .insert({
      user_id: current.authUser.id,
      plan_id: plan.id,
      status: "pending",
      amount_cents: plan.price_cents,
    })
    .select("*")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  try {
    const result = await mpPayment.create({
      body: {
        transaction_amount: plan.price_cents / 100,
        token,
        description: `Assinatura ${plan.name} — Sinal`,
        installments: installments ?? 1,
        payment_method_id,
        issuer_id,
        payer,
        external_reference: paymentRow.id,
        metadata: { user_id: current.authUser.id, plan_id: plan.id, payment_row_id: paymentRow.id },
      },
    });

    const status = result.status; // approved | in_process | rejected
    const dbStatus =
      status === "approved" ? "approved" : status === "rejected" ? "rejected" : "pending";

    await supabaseAdmin
      .from("payments")
      .update({
        mp_payment_id: String(result.id),
        status: dbStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentRow.id);

    if (dbStatus === "approved") {
      await supabaseAdmin
        .from("profiles")
        .update({ plan_id: plan.id })
        .eq("id", current.authUser.id);
    }

    return NextResponse.json({
      status: dbStatus,
      status_detail: result.status_detail,
    });
  } catch (err) {
    await supabaseAdmin
      .from("payments")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", paymentRow.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
