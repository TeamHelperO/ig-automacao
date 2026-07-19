"use client";

import { useState } from "react";

type Collaborator = {
  id: string;
  user_id: string;
  profiles: { email: string } | null;
};

export default function CollaboratorsManager({
  accountId,
  initialCollaborators,
}: {
  accountId: string;
  initialCollaborators: Collaborator[];
}) {
  const [collaborators, setCollaborators] = useState(initialCollaborators);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function addCollaborator(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/accounts/${accountId}/collaborators`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();

    setSaving(false);
    if (res.ok) {
      setCollaborators((prev) => [...prev, json.data]);
      setEmail("");
    } else {
      setError(json.error ?? "Erro ao adicionar.");
    }
  }

  async function remove(id: string) {
    setCollaborators((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/accounts/${accountId}/collaborators/${id}`, { method: "DELETE" });
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="text-sm font-medium text-[var(--ink-soft)] uppercase tracking-wide mb-3">
          Colaboradores
        </h2>
        {collaborators.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)]">
            Só você tem acesso a essa conta por enquanto.
          </p>
        ) : (
          <ul className="space-y-2">
            {collaborators.map((c) => (
              <li key={c.id} className="card p-3 flex items-center justify-between">
                <span className="text-sm text-[var(--ink)]">{c.profiles?.email}</span>
                <button onClick={() => remove(c.id)} className="btn-danger-text text-xs">
                  Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={addCollaborator} className="card p-4">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">
          Convidar por email
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            required
            placeholder="email@exemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input"
          />
          <button type="submit" disabled={saving} className="btn btn-primary shrink-0">
            {saving ? "..." : "Adicionar"}
          </button>
        </div>
        {error && <p className="text-xs text-[var(--coral)] mt-2">{error}</p>}
        <p className="text-xs text-[var(--ink-faint)] mt-2">
          A pessoa precisa já ter uma conta no Sinal (peça pra ela se cadastrar
          primeiro se ainda não tiver).
        </p>
      </form>
    </div>
  );
}
