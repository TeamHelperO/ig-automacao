"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Post = {
  id: string;
  format: "feed" | "carousel";
  idea: string;
  caption: string | null;
  image_urls: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  error: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "rascunho",
  generating: "gerando...",
  ready: "pronto",
  scheduled: "agendado",
  publishing: "publicando...",
  published: "publicado",
  failed: "falhou",
};

const STATUS_PILL: Record<string, string> = {
  ready: "pill-signal",
  scheduled: "pill-amber",
  published: "pill-signal",
  failed: "pill-coral",
  generating: "pill-amber",
  publishing: "pill-amber",
};

export default function ContentClient() {
  const params = useParams<{ accountId: string }>();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [idea, setIdea] = useState("");
  const [format, setFormat] = useState<"feed" | "carousel">("feed");
  const [count, setCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [scheduleValue, setScheduleValue] = useState("");

  function loadPosts() {
    fetch(`/api/accounts/${params.accountId}/content`)
      .then((r) => r.json())
      .then((json) => setPosts(json.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.accountId]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!idea.trim()) return;
    setGenerating(true);
    setGenError("");

    const res = await fetch(`/api/accounts/${params.accountId}/content/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idea, format, count }),
    });
    const json = await res.json();

    setGenerating(false);
    if (res.ok) {
      setIdea("");
      loadPosts();
    } else {
      setGenError(json.error ?? "Erro ao gerar.");
    }
  }

  async function handlePublishNow(postId: string) {
    if (!confirm("Publicar esse post agora no Instagram?")) return;
    const res = await fetch(`/api/accounts/${params.accountId}/content/${postId}/publish`, {
      method: "POST",
    });
    const json = await res.json();
    if (!res.ok) alert(json.error ?? "Erro ao publicar.");
    loadPosts();
  }

  async function handleSchedule(postId: string) {
    if (!scheduleValue) return;
    const res = await fetch(`/api/accounts/${params.accountId}/content/${postId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduled_at: new Date(scheduleValue).toISOString() }),
    });
    if (res.ok) {
      setScheduling(null);
      setScheduleValue("");
      loadPosts();
    }
  }

  async function handleDelete(postId: string) {
    if (!confirm("Excluir esse post?")) return;
    await fetch(`/api/accounts/${params.accountId}/content/${postId}`, { method: "DELETE" });
    loadPosts();
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="card p-4 bg-[var(--amber-soft)] border-[var(--amber)]">
        <p className="text-sm text-[var(--amber)]">
          ⚠ A publicação real depende de uma permissão que ainda não foi aprovada pela Meta
          (Análise do App em andamento). Você já pode gerar e testar o conteúdo aqui — o botão
          "Publicar" só vai funcionar de verdade depois da aprovação.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="card p-5 space-y-3">
        <p className="text-sm font-medium text-[var(--ink)]">Criar novo post com IA</p>
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          className="input"
          rows={3}
          placeholder="Descreve a ideia do post — a IA olha os posts recentes do perfil pra manter o estilo, gera a arte e a legenda."
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={format === "feed"}
              onChange={() => setFormat("feed")}
            />
            Feed (1 imagem)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={format === "carousel"}
              onChange={() => setFormat("carousel")}
            />
            Carrossel
          </label>
          {format === "carousel" && (
            <input
              type="number"
              min={2}
              max={10}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input w-20"
            />
          )}
        </div>
        {genError && <p className="text-xs text-[var(--coral)]">{genError}</p>}
        <button type="submit" disabled={generating} className="btn btn-primary">
          {generating ? "Gerando (pode levar um minuto)..." : "✨ Gerar conteúdo"}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>
      ) : posts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">Nenhum post criado ainda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p className="text-sm font-medium text-[var(--ink)]">{p.idea}</p>
                  <p className="text-xs text-[var(--ink-faint)] mt-0.5">
                    {p.format === "carousel" ? "carrossel" : "feed"} ·{" "}
                    {new Date(p.created_at).toLocaleDateString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </p>
                </div>
                <span className={`pill ${STATUS_PILL[p.status] ?? "pill-neutral"} shrink-0`}>
                  <span className="pill-dot" /> {STATUS_LABEL[p.status] ?? p.status}
                </span>
              </div>

              {p.image_urls.length > 0 && (
                <div className="flex gap-2 mb-3 overflow-x-auto">
                  {p.image_urls.map((url, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={url}
                      alt=""
                      className="w-24 h-24 rounded-lg object-cover border border-[var(--border)] shrink-0"
                    />
                  ))}
                </div>
              )}

              {p.caption && (
                <p className="text-sm text-[var(--ink-soft)] mb-3 whitespace-pre-wrap">
                  {p.caption}
                </p>
              )}

              {p.error && <p className="text-xs text-[var(--coral)] mb-3">{p.error}</p>}

              {p.status === "scheduled" && p.scheduled_at && (
                <p className="text-xs text-[var(--ink-faint)] mb-3">
                  Agendado pra{" "}
                  {new Date(p.scheduled_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </p>
              )}

              {p.status === "ready" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => handlePublishNow(p.id)} className="btn btn-primary text-xs">
                    Publicar agora
                  </button>
                  {scheduling === p.id ? (
                    <>
                      <input
                        type="datetime-local"
                        value={scheduleValue}
                        onChange={(e) => setScheduleValue(e.target.value)}
                        className="input w-auto text-xs"
                      />
                      <button onClick={() => handleSchedule(p.id)} className="btn btn-outline text-xs">
                        Confirmar
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setScheduling(p.id)} className="btn btn-outline text-xs">
                      Agendar
                    </button>
                  )}
                  <button onClick={() => handleDelete(p.id)} className="btn-danger-text text-xs">
                    Excluir
                  </button>
                </div>
              )}
              {(p.status === "failed" || p.status === "draft") && (
                <button onClick={() => handleDelete(p.id)} className="btn-danger-text text-xs">
                  Excluir
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
