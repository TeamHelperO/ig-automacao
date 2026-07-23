import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { mpPreApproval } from "@/lib/mercadopago";

// "Excluir o cartão" na prática cancela a assinatura recorrente: é a
// única forma de parar a cobrança automática mensal.
export async function POST() {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("*")
    .eq("user_id", current.authUser.id)
    .eq("status", "authorized")
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!sub) return NextResponse.json({ error: "nenhuma assinatura ativa encontrada" }, { status: 404 });

  if (sub.mp_preapproval_id) {
    try {
      await mpPreApproval.update({
        id: sub.mp_preapproval_id,
        body: { status: "cancelled" },
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : String(err) },
        { status: 500 }
      );
    }
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", sub.id);

  // volta pro plano grátis
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
      .eq("id", current.authUser.id);
  }

  return NextResponse.json({ ok: true });
}
