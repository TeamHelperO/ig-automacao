"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Conversation = {
  id: string;
  username: string | null;
  ig_scoped_id: string;
  last_message: { text: string; direction: string; created_at: string };
  window_open: boolean;
};

type Message = {
  id: string;
  direction: "inbound" | "outbound";
  text: string;
  source: string;
  created_at: string;
};

export default function InboxClient() {
  const params = useParams<{ accountId: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadEndRef = useRef<HTMLDivElement>(null);

  function loadConversations() {
    fetch(`/api/accounts/${params.accountId}/messages`)
      .then((r) => r.json())
      .then((json) => setConversations(json.data ?? []))
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.accountId]);

  function loadThread(conv: Conversation) {
    setSelected(conv);
    setError("");
    fetch(`/api/accounts/${params.accountId}/messages?contact_id=${conv.id}`)
      .then((r) => r.json())
      .then((json) => setMessages(json.data ?? []));
  }

  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => {
      fetch(`/api/accounts/${params.accountId}/messages?contact_id=${selected.id}`)
        .then((r) => r.json())
        .then((json) => setMessages(json.data ?? []));
    }, 5000);
    return () => clearInterval(interval);
  }, [selected, params.accountId]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !draft.trim()) return;
    setSending(true);
    setError("");

    const res = await fetch(`/api/accounts/${params.accountId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: selected.id, text: draft }),
    });
    const json = await res.json();

    setSending(false);
    if (res.ok) {
      setDraft("");
      loadThread(selected);
      loadConversations();
    } else {
      setError(json.error ?? "Erro ao enviar.");
    }
  }

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-260px)] min-h-[500px]">
      {/* lista de conversas */}
      <div className="card overflow-y-auto">
        {loadingList ? (
          <p className="text-sm text-[var(--ink-faint)] p-4">Carregando...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)] p-4">
            Nenhuma conversa ainda. Assim que alguém mandar DM, aparece aqui.
          </p>
        ) : (
          <ul>
            {conversations.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => loadThread(c)}
                  className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--paper)] ${
                    selected?.id === c.id ? "bg-[var(--paper)]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {c.username ? `@${c.username}` : c.ig_scoped_id}
                    </p>
                    {c.window_open && <span className="pill-dot text-[var(--signal)] shrink-0" />}
                  </div>
                  <p className="text-xs text-[var(--ink-faint)] truncate mt-0.5">
                    {c.last_message.direction === "outbound" ? "você: " : ""}
                    {c.last_message.text}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* thread */}
      <div className="card flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-[var(--ink-faint)]">Escolhe uma conversa pra ver</p>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
              <p className="text-sm font-medium text-[var(--ink)]">
                {selected.username ? `@${selected.username}` : selected.ig_scoped_id}
              </p>
              <span className={`pill ${selected.window_open ? "pill-signal" : "pill-neutral"}`}>
                <span className="pill-dot" /> {selected.window_open ? "janela aberta" : "janela fechada"}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${
                      m.direction === "outbound"
                        ? "bg-[var(--indigo)] text-white"
                        : "bg-[var(--paper)] text-[var(--ink)]"
                    }`}
                  >
                    <p>{m.text}</p>
                    <p
                      className={`text-[10px] mt-1 mono ${
                        m.direction === "outbound" ? "text-white/50" : "text-[var(--ink-faint)]"
                      }`}
                    >
                      {m.source === "automation" ? "automação · " : m.source === "manual" ? "você · " : ""}
                      {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "America/Sao_Paulo",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            <form onSubmit={handleSend} className="p-3 border-t border-[var(--border)]">
              {!selected.window_open && (
                <p className="text-xs text-[var(--coral)] mb-2">
                  Janela de 24h fechada — só dá pra responder de novo depois que a pessoa mandar
                  outra mensagem (regra do Instagram).
                </p>
              )}
              {error && <p className="text-xs text-[var(--coral)] mb-2">{error}</p>}
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={!selected.window_open || sending}
                  placeholder="Escreve uma mensagem..."
                  className="input"
                />
                <button
                  type="submit"
                  disabled={!selected.window_open || sending || !draft.trim()}
                  className="btn btn-primary shrink-0"
                >
                  {sending ? "..." : "Enviar"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
