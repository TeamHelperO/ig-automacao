"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function FinanceCharts({
  usersSeries,
  planDistribution,
}: {
  usersSeries: { month: string; novos: number }[];
  planDistribution: { name: string; usuarios: number }[];
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-5">
        <p className="text-sm font-medium text-[var(--ink)] mb-4">
          Novos usuários (últimos 6 meses)
        </p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={usersSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--ink-faint)" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--ink-faint)" />
            <Tooltip />
            <Bar dataKey="novos" fill="var(--signal)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-[var(--ink)] mb-4">Usuários por plano</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={planDistribution} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--ink-faint)" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke="var(--ink-faint)" width={80} />
            <Tooltip />
            <Bar dataKey="usuarios" fill="var(--indigo)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
