import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PlanosPage() {
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--ink-faint)]">
        ← Painel
      </Link>
      <h1 className="text-2xl font-semibold text-[var(--ink)] mt-2 mb-8">Planos</h1>

      <ul className="space-y-3">
        {(plans ?? []).map((p) => {
          const isCurrent = current.profile?.plan_id === p.id;
          return (
            <li
              key={p.id}
              className={`bg-[var(--surface)] border rounded-xl p-5 flex items-center justify-between ${
                isCurrent ? "border-[var(--indigo)]" : "border-[var(--border)]"
              }`}
            >
              <div>
                <p className="font-medium text-[var(--ink)]">{p.name}</p>
                <p className="text-sm text-[var(--ink-faint)]">
                  R$ {(p.price_cents / 100).toFixed(2)}/mês · até{" "}
                  {p.max_ig_accounts} conta(s) de Instagram
                </p>
              </div>
              {isCurrent ? (
                <span className="text-xs bg-neutral-100 text-[var(--ink-faint)] px-3 py-1.5 rounded-full font-medium">
                  Plano atual
                </span>
              ) : (
                <span className="text-xs text-[var(--ink-faint)]">
                  Em breve: assinatura online
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-[var(--ink-faint)] mt-6">
        Por enquanto, upgrades são feitos manualmente. Fale com o administrador
        pra mudar de plano.
      </p>
    </main>
  );
}
