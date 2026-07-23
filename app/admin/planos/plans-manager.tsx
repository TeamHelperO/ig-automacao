"use client";

import { useState } from "react";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  max_ig_accounts: number;
  trial_days: number | null;
  max_messages_per_month: number | null;
  active: boolean;
};

const emptyForm = {
  name: "",
  price_cents: 0,
  max_ig_accounts: 1,
  trial_days: "" as string | number,
  max_messages_per_month: "" as string | number,
};

export default function PlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Plan | null>(null);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        trial_days: form.trial_days === "" ? null : Number(form.trial_days),
        max_messages_per_month:
          form.max_messages_per_month === "" ? null : Number(form.max_messages_per_month),
      }),
    });
    setSaving(false);
    if (res.ok) {
      const json = await res.json();
      setPlans((prev) => [...prev, json.data]);
      setForm(emptyForm);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, active } : p)));
    await fetch(`/api/admin/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  }

  function startEdit(p: Plan) {
    setEditingId(p.id);
    setEditForm({ ...p });
  }

  async function saveEdit() {
    if (!editForm) return;
    const res = await fetch(`/api/admin/plans/${editForm.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        price_cents: editForm.price_cents,
        max_ig_accounts: editForm.max_ig_accounts,
        trial_days: editForm.trial_days,
        max_messages_per_month: editForm.max_messages_per_month,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setPlans((prev) => prev.map((p) => (p.id === json.data.id ? json.data : p)));
      setEditingId(null);
    }
  }

  async function deletePlan(id: string) {
    if (!confirm("Excluir esse plano?")) return;
    const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans((prev) => prev.filter((p) => p.id !== id));
    } else {
      const json = await res.json();
      alert(json.error ?? "Erro ao excluir.");
    }
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {plans.map((p) =>
          editingId === p.id && editForm ? (
            <li key={p.id} className="card p-4 space-y-2">
              <input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="input"
                placeholder="Nome"
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="block text-xs text-[var(--ink-faint)] mb-1">Preço (centavos)</span>
                  <input
                    type="number"
                    value={editForm.price_cents}
                    onChange={(e) => setEditForm({ ...editForm, price_cents: Number(e.target.value) })}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-[var(--ink-faint)] mb-1">Máx. contas IG</span>
                  <input
                    type="number"
                    value={editForm.max_ig_accounts}
                    onChange={(e) => setEditForm({ ...editForm, max_ig_accounts: Number(e.target.value) })}
                    className="input"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-[var(--ink-faint)] mb-1">Trial (dias, só grátis)</span>
                  <input
                    type="number"
                    value={editForm.trial_days ?? ""}
                    onChange={(e) =>
                      setEditForm({ ...editForm, trial_days: e.target.value === "" ? null : Number(e.target.value) })
                    }
                    className="input"
                    placeholder="sem limite"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs text-[var(--ink-faint)] mb-1">Mensagens/mês</span>
                  <input
                    type="number"
                    value={editForm.max_messages_per_month ?? ""}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        max_messages_per_month: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                    className="input"
                    placeholder="ilimitado"
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setEditingId(null)} className="btn-ghost text-xs">
                  Cancelar
                </button>
                <button onClick={saveEdit} className="btn btn-primary text-xs">
                  Salvar
                </button>
              </div>
            </li>
          ) : (
            <li key={p.id} className="card p-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-[var(--ink)]">{p.name}</p>
                <p className="text-xs text-[var(--ink-faint)] mono">
                  R$ {(p.price_cents / 100).toFixed(2)} · {p.max_ig_accounts} contas ·{" "}
                  {p.trial_days ? `${p.trial_days}d trial` : "sem trial"} ·{" "}
                  {p.max_messages_per_month ? `${p.max_messages_per_month} msg/mês` : "msgs ilimitadas"}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleActive(p.id, !p.active)}
                  className={`pill ${p.active ? "pill-signal" : "pill-neutral"}`}
                >
                  {p.active ? "Ativo" : "Inativo"}
                </button>
                <button onClick={() => startEdit(p)} className="btn-ghost text-xs">
                  Editar
                </button>
                <button onClick={() => deletePlan(p.id)} className="btn-danger-text text-xs">
                  Excluir
                </button>
              </div>
            </li>
          )
        )}
      </ul>

      <form onSubmit={createPlan} className="card p-4 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Novo plano</p>
        <input
          required
          placeholder="Nome (ex: Pro)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input"
        />
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-xs text-[var(--ink-faint)] mb-1">Preço em centavos</span>
            <input
              type="number"
              min={0}
              placeholder="4990 = R$49,90"
              value={form.price_cents}
              onChange={(e) => setForm((f) => ({ ...f, price_cents: Number(e.target.value) }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--ink-faint)] mb-1">Máx. contas de Instagram</span>
            <input
              type="number"
              min={1}
              value={form.max_ig_accounts}
              onChange={(e) => setForm((f) => ({ ...f, max_ig_accounts: Number(e.target.value) }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--ink-faint)] mb-1">Trial em dias (só faz sentido no plano grátis)</span>
            <input
              type="number"
              min={0}
              placeholder="deixe em branco pra sem limite"
              value={form.trial_days}
              onChange={(e) => setForm((f) => ({ ...f, trial_days: e.target.value }))}
              className="input"
            />
          </label>
          <label className="block">
            <span className="block text-xs text-[var(--ink-faint)] mb-1">Mensagens por mês</span>
            <input
              type="number"
              min={0}
              placeholder="deixe em branco pra ilimitado"
              value={form.max_messages_per_month}
              onChange={(e) => setForm((f) => ({ ...f, max_messages_per_month: e.target.value }))}
              className="input"
            />
          </label>
        </div>
        <button type="submit" disabled={saving} className="btn btn-primary w-full">
          {saving ? "Criando..." : "Criar plano"}
        </button>
      </form>
    </div>
  );
}
