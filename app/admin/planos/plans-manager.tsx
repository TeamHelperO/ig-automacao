"use client";

import { useState } from "react";

type Plan = {
  id: string;
  name: string;
  price_cents: number;
  max_ig_accounts: number;
  active: boolean;
};

export default function PlansManager({ initialPlans }: { initialPlans: Plan[] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [form, setForm] = useState({ name: "", price_cents: 0, max_ig_accounts: 1 });
  const [saving, setSaving] = useState(false);

  async function createPlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const json = await res.json();
      setPlans((prev) => [...prev, json.data]);
      setForm({ name: "", price_cents: 0, max_ig_accounts: 1 });
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

  return (
    <div className="space-y-6">
      <ul className="space-y-3">
        {plans.map((p) => (
          <li
            key={p.id}
            className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between"
          >
            <div>
              <p className="font-medium text-neutral-900">{p.name}</p>
              <p className="text-xs text-neutral-500">
                R$ {(p.price_cents / 100).toFixed(2)} · {p.max_ig_accounts} contas de
                Instagram
              </p>
            </div>
            <button
              onClick={() => toggleActive(p.id, !p.active)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                p.active ? "bg-green-100 text-green-800" : "bg-neutral-100 text-neutral-500"
              }`}
            >
              {p.active ? "Ativo" : "Inativo"}
            </button>
          </li>
        ))}
      </ul>

      <form
        onSubmit={createPlan}
        className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3"
      >
        <p className="text-sm font-medium text-neutral-900">Novo plano</p>
        <input
          required
          placeholder="Nome (ex: Pro)"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="input"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            min={0}
            placeholder="Preço em centavos (ex: 4990 = R$49,90)"
            value={form.price_cents}
            onChange={(e) =>
              setForm((f) => ({ ...f, price_cents: Number(e.target.value) }))
            }
            className="input"
          />
          <input
            type="number"
            min={1}
            placeholder="Máx. contas de Instagram"
            value={form.max_ig_accounts}
            onChange={(e) =>
              setForm((f) => ({ ...f, max_ig_accounts: Number(e.target.value) }))
            }
            className="input"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Criando..." : "Criar plano"}
        </button>
      </form>
    </div>
  );
}
