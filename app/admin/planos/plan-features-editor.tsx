"use client";

import { useEffect, useState } from "react";
import { FEATURE_CATALOG, type FeatureKey } from "@/lib/features";

type FeatureRow = { feature_key: string; enabled: boolean; limit_value: number | null };

export default function PlanFeaturesEditor({
  planId,
  onClose,
}: {
  planId: string;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Record<FeatureKey, { enabled: boolean; unlimited: boolean; limit: number }>>(
    () =>
      Object.fromEntries(
        FEATURE_CATALOG.map((f) => [f.key, { enabled: false, unlimited: true, limit: 0 }])
      ) as any
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch(`/api/admin/plans/${planId}/features`)
      .then((r) => r.json())
      .then((json) => {
        const byKey: Record<string, FeatureRow> = {};
        for (const row of json.data ?? []) byKey[row.feature_key] = row;

        setRows((prev) => {
          const next = { ...prev };
          for (const f of FEATURE_CATALOG) {
            const existing = byKey[f.key];
            if (existing) {
              next[f.key] = {
                enabled: existing.enabled,
                unlimited: existing.limit_value === null,
                limit: existing.limit_value ?? 0,
              };
            }
          }
          return next;
        });
      })
      .finally(() => setLoading(false));
  }, [planId]);

  function updateRow(key: FeatureKey, patch: Partial<{ enabled: boolean; unlimited: boolean; limit: number }>) {
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg("");

    const features = FEATURE_CATALOG.map((f) => ({
      feature_key: f.key,
      enabled: rows[f.key].enabled,
      limit_value: rows[f.key].enabled && !rows[f.key].unlimited ? rows[f.key].limit : null,
    }));

    const res = await fetch(`/api/admin/plans/${planId}/features`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });

    setSaving(false);
    setSaveMsg(res.ok ? "Salvo." : "Erro ao salvar.");
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-[var(--ink)]">Funcionalidades do plano</p>
          <button onClick={onClose} className="text-[var(--ink-faint)]">
            ✕
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>
        ) : (
          <div className="space-y-4">
            {FEATURE_CATALOG.map((f) => {
              const row = rows[f.key];
              return (
                <div key={f.key} className="border-b border-[var(--border)] pb-4 last:border-0">
                  <label className="flex items-center gap-2 text-sm font-medium text-[var(--ink)] mb-2">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) => updateRow(f.key, { enabled: e.target.checked })}
                    />
                    {f.label}
                  </label>
                  {f.hasLimit && row.enabled && (
                    <div className="flex items-center gap-3 ml-6">
                      <label className="flex items-center gap-1.5 text-xs text-[var(--ink-soft)]">
                        <input
                          type="checkbox"
                          checked={row.unlimited}
                          onChange={(e) => updateRow(f.key, { unlimited: e.target.checked })}
                        />
                        Ilimitado
                      </label>
                      {!row.unlimited && (
                        <input
                          type="number"
                          min={0}
                          value={row.limit}
                          onChange={(e) => updateRow(f.key, { limit: Number(e.target.value) })}
                          className="input w-24"
                          placeholder={f.limitLabel}
                        />
                      )}
                      {!row.unlimited && (
                        <span className="text-xs text-[var(--ink-faint)]">{f.limitLabel}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 mt-5">
          <button onClick={handleSave} disabled={saving || loading} className="btn btn-primary">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {saveMsg && <p className="text-xs text-[var(--ink-faint)]">{saveMsg}</p>}
        </div>
      </div>
    </div>
  );
}
