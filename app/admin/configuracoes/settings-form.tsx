"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SystemSettings } from "@/lib/settings";

export default function SettingsForm({ initial }: { initial: SystemSettings }) {
  const router = useRouter();
  const [appName, setAppName] = useState(initial.app_name);
  const [primaryColor, setPrimaryColor] = useState(initial.primary_color);
  const [accentColor, setAccentColor] = useState(initial.accent_color);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo_url);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");

    const form = new FormData();
    form.set("app_name", appName);
    form.set("primary_color", primaryColor);
    form.set("accent_color", accentColor);
    if (logoFile) form.set("logo", logoFile);

    const res = await fetch("/api/admin/settings", { method: "POST", body: form });
    setSaving(false);

    if (res.ok) {
      setSaveMsg("Salvo! Atualizando em todo o sistema...");
      router.refresh();
      setTimeout(() => window.location.reload(), 600);
    } else {
      const json = await res.json();
      setSaveMsg(json.error ?? "Erro ao salvar.");
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="card p-5">
        <label className="block mb-4">
          <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
            Nome do sistema
          </span>
          <input
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            className="input"
            placeholder="Sinal"
          />
        </label>

        <span className="block text-xs font-medium text-[var(--ink-soft)] mb-2">Logo</span>
        <div className="flex items-center gap-4 mb-1">
          <div className="w-14 h-14 rounded-lg border border-[var(--border)] bg-[var(--paper)] flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="text-xs text-[var(--ink-faint)]">sem logo</span>
            )}
          </div>
          <input type="file" accept="image/*" onChange={handleLogoChange} className="input" />
        </div>
        <p className="text-xs text-[var(--ink-faint)]">
          PNG ou SVG com fundo transparente funciona melhor. Até 3MB.
        </p>
      </div>

      <div className="card p-5">
        <p className="text-sm font-medium text-[var(--ink)] mb-4">Paleta de cores</p>
        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
              Cor principal (estrutura, sidebar)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-10 h-10 rounded border border-[var(--border-strong)] cursor-pointer"
              />
              <input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="input"
              />
            </div>
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
              Cor de destaque (botões, sinais)
            </span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="w-10 h-10 rounded border border-[var(--border-strong)] cursor-pointer"
              />
              <input
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="input"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="btn btn-primary">
          {saving ? "Salvando..." : "Salvar e aplicar em tudo"}
        </button>
        {saveMsg && <p className="text-xs text-[var(--ink-faint)]">{saveMsg}</p>}
      </div>
    </form>
  );
}
