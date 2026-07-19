"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Step = {
  id: string;
  step_order: number;
  delay_minutes: number;
  message_text: string | null;
  link_url: string | null;
  link_button_label: string | null;
};

export default function SequenciaPage() {
  const params = useParams<{ accountId: string; autoId: string }>();
  const router = useRouter();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    message_text: "",
    link_url: "",
    link_button_label: "",
    delay_minutes: 60,
  });

  useEffect(() => {
    fetch(`/api/automations/${params.autoId}/followups`)
      .then((r) => r.json())
      .then((json) => setSteps(json.data ?? []))
      .finally(() => setLoading(false));
  }, [params.autoId]);

  async function addStep(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch(`/api/automations/${params.autoId}/followups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const json = await res.json();
      setSteps((prev) => [...prev, json.data]);
      setForm({ message_text: "", link_url: "", link_button_label: "", delay_minutes: 60 });
    }
  }

  async function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/automations/${params.autoId}/followups/${id}`, { method: "DELETE" });
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <button
        onClick={() => router.push(`/dashboard/accounts/${params.accountId}`)}
        className="text-sm text-[var(--ink-faint)]"
      >
        ← Automações
      </button>
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mt-3 mb-2">
        Sequência de mensagens
      </h1>
      <p className="text-sm text-[var(--ink-soft)] mb-8">
        Passos extras enviados depois do link e do lembrete padrão, um atrás
        do outro, contando a partir do momento em que a pessoa abre a
        conversa (toca no botão de resposta rápida).
      </p>

      {loading ? (
        <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>
      ) : (
        <ul className="space-y-3 mb-8">
          {steps.length === 0 && (
            <p className="text-sm text-[var(--ink-faint)]">Nenhum passo extra configurado.</p>
          )}
          {steps.map((s, i) => (
            <li key={s.id} className="card p-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[var(--ink-faint)] mono mb-1">
                  passo {i + 1} · {s.delay_minutes} min depois
                </p>
                <p className="text-sm text-[var(--ink)]">{s.message_text}</p>
                {s.link_url && (
                  <p className="text-xs text-[var(--ink-faint)] mt-1">
                    botão: {s.link_button_label} → {s.link_url}
                  </p>
                )}
              </div>
              <button onClick={() => removeStep(s.id)} className="btn-danger-text text-xs shrink-0">
                Excluir
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={addStep} className="card p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Adicionar passo</p>
        <textarea
          required
          placeholder="Texto da mensagem"
          value={form.message_text}
          onChange={(e) => setForm((f) => ({ ...f, message_text: e.target.value }))}
          className="input"
          rows={2}
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            placeholder="URL do botão (opcional)"
            value={form.link_url}
            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
            className="input"
          />
          <input
            placeholder="Rótulo do botão"
            value={form.link_button_label}
            onChange={(e) => setForm((f) => ({ ...f, link_button_label: e.target.value }))}
            className="input"
          />
        </div>
        <label className="block">
          <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
            Atraso (minutos após abrir a conversa)
          </span>
          <input
            type="number"
            min={1}
            value={form.delay_minutes}
            onChange={(e) => setForm((f) => ({ ...f, delay_minutes: Number(e.target.value) }))}
            className="input"
          />
        </label>
        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? "Salvando..." : "Adicionar passo"}
        </button>
      </form>
    </main>
  );
}
