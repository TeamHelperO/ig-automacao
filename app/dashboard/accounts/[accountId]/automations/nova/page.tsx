"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type Media = {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  caption?: string;
  permalink: string;
};

export default function NovaAutomacaoPage() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  const [form, setForm] = useState({
    name: "",
    trigger_comment: true,
    trigger_story_reply: false,
    trigger_dm: false,
    keywords: "",
    match_type: "contains",
    target_media_id: "",
    public_replies: "",
    welcome_dm_text: "Oi! Toque no botão abaixo pra continuar 👇",
    quick_reply_label: "Quero o link",
    link_text: "Aqui está o link 👇",
    link_button_label: "Acessar",
    link_url: "",
    reminder_text: "",
    reminder_delay_minutes: 60,
    ai_enabled: false,
    ai_tone: "",
  });

  useEffect(() => {
    fetch(`/api/media?account_id=${params.accountId}`)
      .then((r) => r.json())
      .then((json) => setMedia(json.data ?? []))
      .finally(() => setLoadingMedia(false));
  }, [params.accountId]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        account_id: params.accountId,
        keywords: form.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        public_replies: form.public_replies.split("\n").map((k) => k.trim()).filter(Boolean),
        target_media_id: form.target_media_id || null,
      }),
    });

    setSaving(false);
    if (res.ok) router.push(`/dashboard/accounts/${params.accountId}`);
    else alert("Erro ao salvar. Tente de novo.");
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-[var(--ink)] mb-6">Nova automação</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Nome da automação">
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="Ex: Promo de julho"
          />
        </Field>

        <Field label="Gatilhos">
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.trigger_comment}
                onChange={(e) => update("trigger_comment", e.target.checked)}
              />
              Comentário
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.trigger_story_reply}
                onChange={(e) => update("trigger_story_reply", e.target.checked)}
              />
              Resposta a story
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.trigger_dm}
                onChange={(e) => update("trigger_dm", e.target.checked)}
              />
              DM direta
            </label>
          </div>
        </Field>

        <Field label="Palavras-chave (separadas por vírgula)">
          <input
            value={form.keywords}
            onChange={(e) => update("keywords", e.target.value)}
            className="input"
            placeholder="quero, eu quero, link"
          />
        </Field>

        <Field label="Tipo de correspondência">
          <select
            value={form.match_type}
            onChange={(e) => update("match_type", e.target.value)}
            className="input"
          >
            <option value="contains">Contém a palavra</option>
            <option value="exact">Comentário é exatamente a palavra</option>
            <option value="any">Qualquer comentário</option>
          </select>
        </Field>

        <Field label="Restringir a um post específico (opcional)">
          {loadingMedia ? (
            <p className="text-sm text-[var(--ink-faint)]">Carregando seus posts...</p>
          ) : media.length === 0 ? (
            <p className="text-sm text-[var(--ink-faint)]">Nenhum post encontrado.</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => update("target_media_id", "")}
                className={`relative aspect-square rounded-lg flex items-center justify-center text-xs text-center p-2 transition-all ${
                  form.target_media_id === ""
                    ? "ring-2 ring-offset-2 ring-[var(--signal)] bg-[var(--signal-soft)] text-[var(--signal-ink)] font-medium"
                    : "border border-[var(--border)] text-[var(--ink-faint)] opacity-70 hover:opacity-100"
                }`}
              >
                Todos os posts
                {form.target_media_id === "" && <SelectedBadge />}
              </button>
              {media.map((m) => {
                const selected = form.target_media_id === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => update("target_media_id", m.id)}
                    className={`relative aspect-square rounded-lg overflow-hidden transition-all ${
                      selected
                        ? "ring-2 ring-offset-2 ring-[var(--signal)]"
                        : "border border-[var(--border)] opacity-60 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                    {selected && <SelectedBadge />}
                  </button>
                );
              })}
            </div>
          )}
        </Field>

        <Field label="Respostas com IA">
          <label className="flex items-center gap-2 text-sm mb-2">
            <input
              type="checkbox"
              checked={form.ai_enabled}
              onChange={(e) => update("ai_enabled", e.target.checked)}
            />
            Gerar respostas variadas com IA, em vez de usar frases fixas
          </label>
          {form.ai_enabled && (
            <input
              value={form.ai_tone}
              onChange={(e) => update("ai_tone", e.target.value)}
              className="input"
              placeholder="Tom da marca (opcional): ex. descontraído, usa emojis, foca em suplementos naturais"
            />
          )}
        </Field>

        <Field label="Respostas públicas no comentário (opcional, uma por linha — usadas se a IA estiver desligada, ou como reserva)">
          <textarea
            value={form.public_replies}
            onChange={(e) => update("public_replies", e.target.value)}
            className="input"
            rows={3}
            placeholder={"Te mandei no privado! 📩\nJá foi no seu direct!"}
          />
        </Field>

        <Field label="Mensagem de boas-vindas (DM) — usada se a IA estiver desligada, ou como reserva">
          <textarea
            required
            value={form.welcome_dm_text}
            onChange={(e) => update("welcome_dm_text", e.target.value)}
            className="input"
            rows={3}
          />
        </Field>

        <Field label="Texto do botão de resposta rápida">
          <input
            required
            value={form.quick_reply_label}
            onChange={(e) => update("quick_reply_label", e.target.value)}
            className="input"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto antes do link">
            <input
              value={form.link_text}
              onChange={(e) => update("link_text", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Rótulo do botão">
            <input
              value={form.link_button_label}
              onChange={(e) => update("link_button_label", e.target.value)}
              className="input"
            />
          </Field>
        </div>

        <Field label="URL do link">
          <input
            required
            type="url"
            value={form.link_url}
            onChange={(e) => update("link_url", e.target.value)}
            className="input"
            placeholder="https://..."
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto do lembrete (opcional)">
            <input
              value={form.reminder_text}
              onChange={(e) => update("reminder_text", e.target.value)}
              className="input"
              placeholder="Ainda dá tempo de pegar o link 😉"
            />
          </Field>
          <Field label="Atraso do lembrete (minutos)">
            <input
              type="number"
              min={1}
              value={form.reminder_delay_minutes}
              onChange={(e) => update("reminder_delay_minutes", Number(e.target.value))}
              className="input"
            />
          </Field>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-[var(--indigo)] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Criar automação"}
        </button>
      </form>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-[var(--ink-soft)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SelectedBadge() {
  return (
    <span className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--signal)] text-white flex items-center justify-center shadow">
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
