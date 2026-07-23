import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import FinanceCharts from "./finance-charts";

export const dynamic = "force-dynamic";

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

export default async function FinanceiroPage() {
  const [{ data: profiles }, { data: subscriptions }, { data: plans }] = await Promise.all([
    supabaseAdmin.from("profiles").select("id, created_at, plan_id"),
    supabaseAdmin.from("subscriptions").select("*, plans(*)").eq("status", "authorized"),
    supabaseAdmin.from("plans").select("*"),
  ]);

  const planById = new Map((plans ?? []).map((p) => [p.id, p]));

  // MRR: soma do preço de todas as assinaturas ativas agora
  const mrrCents = (subscriptions ?? []).reduce(
    (sum, s) => sum + (s.plans?.price_cents ?? 0),
    0
  );
  const activeSubsCount = (subscriptions ?? []).length;

  // usuários novos: mês atual vs mês anterior
  const now = new Date();
  const thisMonthKey = monthKey(now);
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthKey = monthKey(lastMonth);

  const newThisMonth = (profiles ?? []).filter(
    (p) => monthKey(new Date(p.created_at)) === thisMonthKey
  ).length;
  const newLastMonth = (profiles ?? []).filter(
    (p) => monthKey(new Date(p.created_at)) === lastMonthKey
  ).length;

  const growthPct =
    newLastMonth === 0 ? (newThisMonth > 0 ? 100 : 0) : Math.round(((newThisMonth - newLastMonth) / newLastMonth) * 100);

  // série dos últimos 6 meses: novos usuários por mês
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: monthKey(d), label: monthLabel(d) });
  }
  const usersSeries = months.map(({ key, label }) => ({
    month: label,
    novos: (profiles ?? []).filter((p) => monthKey(new Date(p.created_at)) === key).length,
  }));

  // distribuição de usuários por plano
  const planCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (!p.plan_id) continue;
    planCounts.set(p.plan_id, (planCounts.get(p.plan_id) ?? 0) + 1);
  }
  const planDistribution = Array.from(planCounts.entries()).map(([planId, count]) => ({
    name: planById.get(planId)?.name ?? "—",
    usuarios: count,
  }));

  return (
    <main className="max-w-4xl mx-auto px-6 py-10">
      <Link href="/admin" className="text-sm text-[var(--ink-faint)]">
        ← Usuários
      </Link>
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mt-2 mb-8">
        Financeiro
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <div className="card p-4">
          <p className="text-xs text-[var(--ink-faint)] mb-1">Receita mensal (MRR)</p>
          <p className="font-display text-xl text-[var(--ink)]">
            R$ {(mrrCents / 100).toFixed(2)}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--ink-faint)] mb-1">Assinaturas ativas</p>
          <p className="font-display text-xl text-[var(--ink)]">{activeSubsCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--ink-faint)] mb-1">Novos usuários (mês)</p>
          <p className="font-display text-xl text-[var(--ink)]">{newThisMonth}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-[var(--ink-faint)] mb-1">Crescimento vs mês anterior</p>
          <p
            className={`font-display text-xl ${
              growthPct >= 0 ? "text-[var(--signal-ink)]" : "text-[var(--coral)]"
            }`}
          >
            {growthPct >= 0 ? "+" : ""}
            {growthPct}%
          </p>
        </div>
      </div>

      <FinanceCharts usersSeries={usersSeries} planDistribution={planDistribution} />
    </main>
  );
}
