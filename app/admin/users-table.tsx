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
  const [resetOpenId, setResetOpenId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");

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

  async function resetPassword(userId: string) {
    setResetMsg("");
    const res = await fetch(`/api/admin/users/${userId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    if (res.ok) {
      setResetMsg("Senha atualizada.");
      setNewPassword("");
      setTimeout(() => setResetOpenId(null), 1200);
    } else {
      const json = await res.json();
      setResetMsg(json.error ?? "Erro ao trocar senha.");
    }
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
            <th className="px-4 py-3">Senha</th>
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
              <td className="px-4 py-3">
                {resetOpenId === u.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      placeholder="Nova senha"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border border-[var(--border-strong)] rounded-md px-2 py-1 text-sm w-32"
                      autoFocus
                    />
                    <button
                      onClick={() => resetPassword(u.id)}
                      className="text-xs text-[var(--signal-ink)] font-medium"
                    >
                      Salvar
                    </button>
                    <button
                      onClick={() => {
                        setResetOpenId(null);
                        setResetMsg("");
                      }}
                      className="text-xs text-[var(--ink-faint)]"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setResetOpenId(u.id);
                      setNewPassword("");
                      setResetMsg("");
                    }}
                    className="btn-ghost text-xs"
                  >
                    Redefinir
                  </button>
                )}
                {resetOpenId === u.id && resetMsg && (
                  <p className="text-xs text-[var(--ink-faint)] mt-1">{resetMsg}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
