import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { mpPreApproval } from "@/lib/mercadopago";

// Cria uma assinatura recorrente (cobrança mensal automática) usando o
// token do cartão gerado pelo mesmo Brick de cartão que usamos no
// pagamento avulso. Diferente do pagamento único: isso fica cobrando
// todo mês até a pessoa cancelar (ver /cancel-subscription).
export async function POST(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json();
  const { plan_id, token, payer } = body;

  if (!plan_id || !token) {
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  }

  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("id", plan_id)
    .eq("active", true)
    .maybeSingle();

  if (!plan) return NextResponse.json({ error: "plano não encontrado" }, { status: 404 });

  const { data: subRow, error: insertError } = await supabaseAdmin
    .from("subscriptions")
    .insert({ user_id: current.authUser.id, plan_id: plan.id, status: "pending" })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  try {
    const result = await mpPreApproval.create({
      body: {
        reason: `Assinatura ${plan.name} — Sinal`,
        external_reference: subRow.id,
        payer_email: payer?.email ?? current.authUser.email,
        card_token_id: token,
        auto_recurring: {
          frequency: 1,
          frequency_type: "months",
          transaction_amount: plan.price_cents / 100,
          currency_id: "BRL",
        },
        back_url: `${process.env.APP_URL}/dashboard/faturamento`,
        status: "authorized",
      },
    });

    const status = result.status === "authorized" ? "authorized" : "pending";

    await supabaseAdmin
      .from("subscriptions")
      .update({
        mp_preapproval_id: result.id,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subRow.id);

    if (status === "authorized") {
      await supabaseAdmin
        .from("profiles")
        .update({ plan_id: plan.id, plan_started_at: new Date().toISOString() })
        .eq("id", current.authUser.id);
    }

    return NextResponse.json({ status });
  } catch (err) {
    await supabaseAdmin
      .from("subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", subRow.id);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
