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
    <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
          <tr>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Plano</th>
            <th className="px-4 py-3">Contas</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-neutral-100">
              <td className="px-4 py-3">
                {u.email}
                {u.is_super_admin && (
                  <span className="ml-2 text-xs bg-neutral-900 text-white px-2 py-0.5 rounded-full">
                    admin
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <select
                  value={u.plan_id ?? ""}
                  onChange={(e) => changePlan(u.id, e.target.value)}
                  className="border border-neutral-300 rounded-md px-2 py-1 text-sm"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.max_ig_accounts} contas)
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3 text-neutral-500">
                {u.accounts_count}/{u.plans?.max_ig_accounts ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
