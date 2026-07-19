import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import Checkout from "./checkout";

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
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mt-3 mb-8">
        Planos
      </h1>

      <ul className="space-y-3">
        {(plans ?? []).map((p) => {
          const isCurrent = current.profile?.plan_id === p.id;
          return (
            <li
              key={p.id}
              className={`card p-5 flex items-center justify-between gap-4 ${
                isCurrent ? "border-[var(--indigo)]" : ""
              }`}
            >
              <div>
                <p className="font-medium text-[var(--ink)]">{p.name}</p>
                <p className="text-sm text-[var(--ink-soft)]">
                  R$ {(p.price_cents / 100).toFixed(2)}/mês · até{" "}
                  {p.max_ig_accounts} conta(s) de Instagram
                </p>
              </div>
              {isCurrent ? (
                <span className="pill pill-signal shrink-0">
                  <span className="pill-dot" /> plano atual
                </span>
              ) : p.price_cents === 0 ? (
                <span className="text-xs text-[var(--ink-faint)] shrink-0">grátis</span>
              ) : (
                <Checkout planId={p.id} priceCents={p.price_cents} />
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
