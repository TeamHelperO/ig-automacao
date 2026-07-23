"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PromptWizard from "./prompt-wizard";

type KnowledgeChunk = {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
};

export default function AgentClient() {
  const params = useParams<{ accountId: string }>();
  const [enabled, setEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);

  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [addingKnowledge, setAddingKnowledge] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    fetch(`/api/accounts/${params.accountId}/ai-agent`)
      .then((r) => r.json())
      .then((json) => {
        setEnabled(json.data?.enabled ?? false);
        setSystemPrompt(json.data?.system_prompt ?? "");
      })
      .finally(() => setLoading(false));

    loadKnowledge();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.accountId]);

  function loadKnowledge() {
    fetch(`/api/accounts/${params.accountId}/knowledge`)
      .then((r) => r.json())
      .then((json) => setChunks(json.data ?? []));
  }

  async function saveAgent() {
    setSaving(true);
    setSaveMsg("");
    const res = await fetch(`/api/accounts/${params.accountId}/ai-agent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, system_prompt: systemPrompt }),
    });
    setSaving(false);
    setSaveMsg(res.ok ? "Salvo." : "Erro ao salvar.");
  }

  async function addKnowledge(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim()) return;
    setAddingKnowledge(true);
    const res = await fetch(`/api/accounts/${params.accountId}/knowledge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, content: newContent }),
    });
    setAddingKnowledge(false);
    if (res.ok) {
      setNewTitle("");
      setNewContent("");
      loadKnowledge();
    } else {
      const json = await res.json();
      alert(json.error ?? "Erro ao adicionar.");
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/accounts/${params.accountId}/knowledge/upload`, {
      method: "POST",
      body: formData,
    });

    setUploading(false);
    e.target.value = "";

    if (res.ok) {
      loadKnowledge();
    } else {
      const json = await res.json();
      setUploadError(json.error ?? "Erro ao processar o arquivo.");
    }
  }

  async function removeChunk(id: string) {
    const previous = chunks;
    setChunks((prev) => prev.filter((c) => c.id !== id));
    const res = await fetch(`/api/accounts/${params.accountId}/knowledge/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) setChunks(previous);
  }

  if (loading) return <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-[var(--ink)]">Agente de atendimento</p>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
            Ativo
          </label>
        </div>
        <p className="text-xs text-[var(--ink-faint)] mb-3 leading-relaxed">
          Esse agente só responde quando a mensagem de alguém <strong>não bate com nenhuma
          automação</strong> configurada — ele nunca compete com o que você já montou no
          construtor de fluxo, só cobre o resto da conversa. Escreva abaixo como ele deve se
          comportar: quem ele representa, o tom de voz, o que pode e não pode prometer.
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="input mb-3"
          rows={6}
          placeholder={
            "Ex: Você é a atendente virtual da Clínica X. Seja educada, breve, e use as informações da base de conhecimento pra responder dúvidas sobre horários, preços e serviços. Nunca invente informação que não esteja na base."
          }
        />
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="btn btn-outline text-sm mb-3"
        >
          ✨ Montar prompt com perguntas guiadas
        </button>
        <div className="flex items-center gap-3">
          <button onClick={saveAgent} disabled={saving} className="btn btn-primary">
            {saving ? "Salvando..." : "Salvar"}
          </button>
          {saveMsg && <p className="text-xs text-[var(--ink-faint)]">{saveMsg}</p>}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-[var(--ink)] mb-3">Base de conhecimento</p>
        {chunks.length === 0 ? (
          <p className="text-sm text-[var(--ink-faint)] mb-4">Nada cadastrado ainda.</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {chunks.map((c) => (
              <li key={c.id} className="card p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {c.title && <p className="text-xs font-medium text-[var(--ink-soft)] mb-0.5">{c.title}</p>}
                  <p className="text-sm text-[var(--ink)] line-clamp-2">{c.content}</p>
                </div>
                <button onClick={() => removeChunk(c.id)} className="btn-danger-text text-xs shrink-0">
                  Excluir
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="card p-4 mb-3">
          <p className="text-sm font-medium text-[var(--ink)] mb-2">Enviar arquivo</p>
          <p className="text-xs text-[var(--ink-faint)] mb-3">
            PDF, DOCX, XLSX, CSV ou TXT — o texto é extraído e vira base de conhecimento
            automaticamente. Arquivos .doc antigos (Word 97-2003) não são suportados, salva
            como .docx.
          </p>
          <input
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.md"
            onChange={handleFileUpload}
            disabled={uploading}
            className="input"
          />
          {uploading && <p className="text-xs text-[var(--ink-faint)] mt-2">Processando arquivo...</p>}
          {uploadError && <p className="text-xs text-[var(--coral)] mt-2">{uploadError}</p>}
        </div>

        <form onSubmit={addKnowledge} className="card p-4 space-y-3">
          <p className="text-sm font-medium text-[var(--ink)]">Ou colar texto direto</p>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="input"
            placeholder="Título (opcional, ex: Horário de funcionamento)"
          />
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            className="input"
            rows={5}
            placeholder="Cola aqui o texto — preços, horários, políticas, perguntas frequentes, o que for. Pode colar um texto grande, o sistema separa em pedaços sozinho."
          />
          <button type="submit" disabled={addingKnowledge} className="btn btn-primary">
            {addingKnowledge ? "Adicionando..." : "Adicionar"}
          </button>
        </form>
      </div>

      {wizardOpen && (
        <PromptWizard
          onClose={() => setWizardOpen(false)}
          onGenerate={(prompt) => {
            if (
              !systemPrompt.trim() ||
              confirm("Isso substitui o prompt atual. Continuar?")
            ) {
              setSystemPrompt(prompt);
            }
            setWizardOpen(false);
          }}
        />
      )}
    </div>
  );
}
