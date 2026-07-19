"use client";

import { useState } from "react";

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
  initialAutomations,
}: {
  initialAutomations: Automation[];
}) {
  const [automations, setAutomations] = useState(initialAutomations);

  async function toggleActive(id: string, active: boolean) {
    setAutomations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active } : a))
    );
    await fetch(`/api/automations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta automação?")) return;
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    await fetch(`/api/automations/${id}`, { method: "DELETE" });
  }

  function triggersLabel(a: Automation) {
    const list = [];
    if (a.trigger_comment) list.push("comentário");
    if (a.trigger_story_reply) list.push("resposta a story");
    if (a.trigger_dm) list.push("dm");
    return list.join(" + ") || "nenhum gatilho";
  }

  if (automations.length === 0) {
    return (
      <p className="text-sm text-neutral-500 bg-white border border-neutral-200 rounded-xl p-6 text-center">
        Nenhuma automação criada ainda.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {automations.map((a) => (
        <li
          key={a.id}
          className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between"
        >
          <div>
            <p className="font-medium text-neutral-900">{a.name}</p>
            <p className="text-xs text-neutral-500 mt-0.5">
              {triggersLabel(a)} · palavras: {a.keywords.join(", ") || "—"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleActive(a.id, !a.active)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                a.active
                  ? "bg-green-100 text-green-800"
                  : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {a.active ? "Ativa" : "Pausada"}
            </button>
            <button
              onClick={() => remove(a.id)}
              className="text-xs text-red-600"
            >
              Excluir
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
