import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import CancelButton from "./cancel-button";

export const dynamic = "force-dynamic";

export default async function FaturamentoPage() {
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("*, plans(*)")
    .eq("user_id", current.authUser.id)
    .eq("status", "authorized")
    .order("created_at", { ascending: false })
    .maybeSingle();

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--ink-faint)]">
        ← Painel
      </Link>
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mt-3 mb-8">
        Faturamento
      </h1>

      {subscription ? (
        <div className="card p-5">
          <p className="text-sm font-medium text-[var(--ink)] mb-1">
            Assinatura ativa — {subscription.plans?.name}
          </p>
          <p className="text-sm text-[var(--ink-soft)] mb-5">
            R$ {(subscription.plans?.price_cents / 100).toFixed(2)}/mês, cobrado automaticamente
            no cartão cadastrado.
          </p>
          <CancelButton />
          <p className="text-xs text-[var(--ink-faint)] mt-3">
            Remover o cartão cancela a assinatura na hora — seu plano volta pro grátis e a
            cobrança mensal para.
          </p>
        </div>
      ) : (
        <div className="card p-5">
          <p className="text-sm text-[var(--ink-soft)]">
            Você não tem uma assinatura paga ativa no momento.
          </p>
          <Link href="/dashboard/planos" className="btn btn-primary mt-4 inline-block">
            Ver planos
          </Link>
        </div>
      )}
    </main>
  );
}
