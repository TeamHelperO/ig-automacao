"use client";

import { useState } from "react";
import Link from "next/link";

type Automation = {
  id: string;
  name: string;
  active: boolean;
  keywords: string[];
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
};

export default function AutomationsList({
  accountId,
  initialAutomations,
}: {
  accountId: string;
  initialAutomations: Automation[];
}) {
  const [automations, setAutomations] = useState(initialAutomations);

  async function toggleActive(id: string, active: boolean) {
    setAutomations((prev) => prev.map((a) => (a.id === id ? { ...a, active } : a)));
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    const previous = automations;
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    const res = await fetch(`/api/automations/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setAutomations(previous);
      const json = await res.json().catch(() => ({}));
      alert(json.error ?? "Não deu pra excluir essa automação.");
    }
  }

  function triggersLabel(a: Automation) {
    const list = [];
    if (a.trigger_comment) list.push("comentário");
    if (a.trigger_story_reply) list.push("story");
    if (a.trigger_dm) list.push("dm");
    return list.join(" · ") || "sem gatilho";
  }

  if (automations.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-[var(--ink-soft)]">
          Nenhuma automação criada ainda. Crie a primeira pra essa conta.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {automations.map((a) => (
        <li key={a.id} className="card p-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-medium text-[var(--ink)] truncate">{a.name}</p>
            <p className="text-xs text-[var(--ink-faint)] mt-0.5 mono">
              {triggersLabel(a)} · {a.keywords.join(", ") || "sem palavra-chave"}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => toggleActive(a.id, !a.active)}
              className={`pill ${a.active ? "pill-signal" : "pill-neutral"} mr-2`}
            >
              <span className="pill-dot" /> {a.active ? "Ativa" : "Pausada"}
            </button>
            <Link
              href={`/dashboard/accounts/${accountId}/automations/${a.id}/editar`}
              className="btn-ghost text-xs"
            >
              Editar
            </Link>
            <button onClick={() => remove(a.id)} className="btn-danger-text text-xs">
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
