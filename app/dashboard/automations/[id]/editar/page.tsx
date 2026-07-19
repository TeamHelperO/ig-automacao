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

const emptyForm = {
  name: "",
  trigger_comment: true,
  trigger_story_reply: false,
  trigger_dm: false,
  keywords: "",
  match_type: "contains",
  target_media_id: "",
  public_replies: "",
  welcome_dm_text: "",
  quick_reply_label: "",
  link_text: "",
  link_button_label: "",
  link_url: "",
  reminder_text: "",
  reminder_delay_minutes: 60,
};

export default function EditarAutomacaoPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetch(`/api/automations/${params.id}`)
      .then((r) => r.json())
      .then((json) => {
        const a = json.data;
        if (!a) return;
        setForm({
          name: a.name ?? "",
          trigger_comment: a.trigger_comment ?? true,
          trigger_story_reply: a.trigger_story_reply ?? false,
          trigger_dm: a.trigger_dm ?? false,
          keywords: (a.keywords ?? []).join(", "),
          match_type: a.match_type ?? "contains",
          target_media_id: a.target_media_id ?? "",
          public_replies: (a.public_replies ?? []).join("\n"),
          welcome_dm_text: a.welcome_dm_text ?? "",
          quick_reply_label: a.quick_reply_label ?? "",
          link_text: a.link_text ?? "",
          link_button_label: a.link_button_label ?? "",
          link_url: a.link_url ?? "",
          reminder_text: a.reminder_text ?? "",
          reminder_delay_minutes: a.reminder_delay_minutes ?? 60,
        });
      })
      .finally(() => setLoading(false));

    fetch("/api/media")
      .then((r) => r.json())
      .then((json) => setMedia(json.data ?? []))
      .finally(() => setLoadingMedia(false));
  }, [params.id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/automations/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        keywords: form.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean),
        public_replies: form.public_replies
          .split("\n")
          .map((k) => k.trim())
          .filter(Boolean),
        target_media_id: form.target_media_id || null,
      }),
    });

    setSaving(false);
    if (res.ok) router.push("/dashboard");
    else alert("Erro ao salvar. Tente de novo.");
  }

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto px-6 py-10">
        <p className="text-sm text-neutral-400">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-10">
      <h1 className="text-xl font-semibold text-neutral-900 mb-6">
        Editar automação
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Field label="Nome da automação">
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
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
            <p className="text-sm text-neutral-400">Carregando seus posts...</p>
          ) : media.length === 0 ? (
            <p className="text-sm text-neutral-400">Nenhum post encontrado.</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => update("target_media_id", "")}
                className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs text-center p-2 ${
                  form.target_media_id === ""
                    ? "border-neutral-900"
                    : "border-neutral-200"
                }`}
              >
                Todos os posts
              </button>
              {media.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => update("target_media_id", m.id)}
                  className={`aspect-square rounded-lg border-2 overflow-hidden ${
                    form.target_media_id === m.id
                      ? "border-neutral-900"
                      : "border-neutral-200"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.thumbnail_url || m.media_url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </Field>

        <Field label="Respostas públicas no comentário (opcional, uma por linha)">
          <textarea
            value={form.public_replies}
            onChange={(e) => update("public_replies", e.target.value)}
            className="input"
            rows={3}
          />
        </Field>

        <Field label="Mensagem de boas-vindas (DM)">
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
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Texto do lembrete (opcional)">
            <input
              value={form.reminder_text}
              onChange={(e) => update("reminder_text", e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Atraso do lembrete (minutos)">
            <input
              type="number"
              min={1}
              value={form.reminder_delay_minutes}
              onChange={(e) =>
                update("reminder_delay_minutes", Number(e.target.value))
              }
              className="input"
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-neutral-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar alterações"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2.5 text-sm font-medium text-neutral-500"
          >
            Cancelar
          </button>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-neutral-700 mb-1.5">
        {label}
      </span>
      {children}
    </label>
  );
}
