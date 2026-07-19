"use client";

import { useState } from "react";

type Plan = { id: string; name: string; max_ig_accounts: number };
type UserRow = {
  id: string;
  email: string;
  is_super_admin: boolean;
  accounts_count: number;
  plan_id: string | null;
  plans: Plan | null;
};

export default function UsersTable({
  users: initialUsers,
  plans,
}: {
  users: UserRow[];
  plans: Plan[];
}) {
  const [users, setUsers] = useState(initialUsers);

  async function toggleAdmin(userId: string, isAdmin: boolean) {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_super_admin: isAdmin } : u))
    );
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_super_admin: isAdmin }),
    });
  }

  async function changePlan(userId: string, planId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, plan_id: planId, plans: plans.find((p) => p.id === planId) ?? null }
          : u
      )
    );
    await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId }),
    });
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-[var(--paper)] text-left text-xs text-[var(--ink-faint)]">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Plano</th>
            <th className="px-4 py-3">Contas</th>
            <th className="px-4 py-3">Admin</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-[var(--border)]">
              <td className="px-4 py-3">{u.email}</td>
              <td className="px-4 py-3">
                <select
                  value={u.plan_id ?? ""}
                  onChange={(e) => changePlan(u.id, e.target.value)}
                  className="border border-[var(--border-strong)] rounded-md px-2 py-1 text-sm"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.max_ig_accounts} contas)
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-[var(--ink-faint)]">
                {u.accounts_count}/{u.plans?.max_ig_accounts ?? "—"}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => toggleAdmin(u.id, !u.is_super_admin)}
                  className={`pill ${u.is_super_admin ? "pill-amber" : "pill-neutral"}`}
                >
                  {u.is_super_admin ? "Remover" : "Tornar admin"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
