"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type Media = {
  id: string;
  media_type: string;
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
};

type FormState = {
  name: string;
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
  keywords: string;
  match_type: string;
  target_media_id: string;
  public_replies: string;
  welcome_dm_text: string;
  quick_reply_label: string;
  link_text: string;
  link_button_label: string;
  link_url: string;
  reminder_text: string;
  reminder_delay_minutes: number;
  ai_enabled: boolean;
  ai_tone: string;
};

const initialForm: FormState = {
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
};

type BlockId = "trigger" | "publicReply" | "dm" | "link" | "reminder" | "more";

function BlockNode({ data }: { data: any }) {
  return (
    <div
      onClick={data.onClick}
      className={`w-64 rounded-xl border-2 p-4 cursor-pointer transition-all bg-[var(--surface)] ${
        data.active ? "border-[var(--indigo)] shadow-md" : "border-[var(--border)]"
      } ${data.dashed ? "border-dashed opacity-70" : ""}`}
    >
      <Handle type="target" position={Position.Top} style={{ opacity: data.first ? 0 : 1 }} />
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{data.icon}</span>
        <p className="text-sm font-medium text-[var(--ink)]">{data.title}</p>
      </div>
      <p className="text-xs text-[var(--ink-faint)] line-clamp-2">{data.subtitle}</p>
      <Handle type="source" position={Position.Bottom} style={{ opacity: data.last ? 0 : 1 }} />
    </div>
  );
}

const nodeTypes = { block: BlockNode };

export default function FlowBuilder() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [form, setForm] = useState<FormState>(initialForm);
  const [openPanel, setOpenPanel] = useState<BlockId | null>("trigger");

  useEffect(() => {
    fetch(`/api/media?account_id=${params.accountId}`)
      .then((r) => r.json())
      .then((json) => setMedia(json.data ?? []))
      .finally(() => setLoadingMedia(false));
  }, [params.accountId]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const triggerLabel = useMemo(() => {
    const list = [];
    if (form.trigger_comment) list.push("comentário");
    if (form.trigger_story_reply) list.push("story");
    if (form.trigger_dm) list.push("dm");
    const words = form.keywords || "qualquer palavra";
    return `${list.join(" · ") || "sem gatilho"} · "${words}"`;
  }, [form.trigger_comment, form.trigger_story_reply, form.trigger_dm, form.keywords]);

  const nodes: Node[] = useMemo(() => {
    const list: Node[] = [
      {
        id: "trigger",
        type: "block",
        position: { x: 0, y: 0 },
        data: {
          icon: "⚡",
          title: "Gatilho",
          subtitle: triggerLabel,
          active: openPanel === "trigger",
          first: true,
          onClick: () => setOpenPanel("trigger"),
        },
      },
    ];

    if (form.trigger_comment) {
      list.push({
        id: "publicReply",
        type: "block",
        position: { x: 0, y: 130 },
        data: {
          icon: "💬",
          title: "Resposta pública (opcional)",
          subtitle: form.ai_enabled
            ? "gerada por IA"
            : form.public_replies || "nenhuma configurada",
          active: openPanel === "publicReply",
          onClick: () => setOpenPanel("publicReply"),
        },
      });
    }

    list.push({
      id: "dm",
      type: "block",
      position: { x: 0, y: form.trigger_comment ? 260 : 130 },
      data: {
        icon: "✉️",
        title: "DM de boas-vindas",
        subtitle: form.ai_enabled ? "gerada por IA" : form.welcome_dm_text || "sem texto",
        active: openPanel === "dm",
        onClick: () => setOpenPanel("dm"),
      },
    });

    const baseY = (form.trigger_comment ? 260 : 130) + 130;

    list.push({
      id: "link",
      type: "block",
      position: { x: 0, y: baseY },
      data: {
        icon: "🔗",
        title: "Link (após tocar no botão)",
        subtitle: form.link_url || "sem link configurado",
        active: openPanel === "link",
        onClick: () => setOpenPanel("link"),
      },
    });

    list.push({
      id: "reminder",
      type: "block",
      position: { x: 0, y: baseY + 130 },
      data: {
        icon: "⏰",
        title: "Lembrete (opcional)",
        subtitle: form.reminder_text
          ? `${form.reminder_text} · ${form.reminder_delay_minutes}min depois`
          : "nenhum configurado",
        active: openPanel === "reminder",
        onClick: () => setOpenPanel("reminder"),
      },
    });

    list.push({
      id: "more",
      type: "block",
      position: { x: 0, y: baseY + 260 },
      data: {
        icon: "➕",
        title: "Mais passos",
        subtitle: "disponível depois de criar, na tela de Sequência",
        dashed: true,
        last: true,
        onClick: () => {},
      },
    });

    return list;
  }, [form, openPanel, triggerLabel]);

  const edges: Edge[] = useMemo(() => {
    const ids = nodes.map((n) => n.id);
    const result: Edge[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      result.push({
        id: `${ids[i]}-${ids[i + 1]}`,
        source: ids[i],
        target: ids[i + 1],
        style: { stroke: "var(--border-strong)", strokeWidth: 2 },
      });
    }
    return result;
  }, [nodes]);

  async function handleSubmit() {
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
    <div className="grid lg:grid-cols-[1fr_360px] gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      <div className="card overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
        >
          <Background gap={20} color="var(--border)" />
        </ReactFlow>
      </div>

      <div className="card p-5 overflow-y-auto">
        <label className="block mb-4">
          <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
            Nome da automação
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="input"
            placeholder="Ex: Promo de julho"
          />
        </label>

        {openPanel === "trigger" && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-[var(--ink)]">⚡ Gatilho</p>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.trigger_comment} onChange={(e) => update("trigger_comment", e.target.checked)} />
                Comentário
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.trigger_story_reply} onChange={(e) => update("trigger_story_reply", e.target.checked)} />
                Resposta a story
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.trigger_dm} onChange={(e) => update("trigger_dm", e.target.checked)} />
                DM direta
              </label>
            </div>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Palavras-chave (vírgula)</span>
              <input value={form.keywords} onChange={(e) => update("keywords", e.target.value)} className="input" placeholder="quero, eu quero" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Correspondência</span>
              <select value={form.match_type} onChange={(e) => update("match_type", e.target.value)} className="input">
                <option value="contains">Contém a palavra</option>
                <option value="exact">É exatamente a palavra</option>
                <option value="any">Qualquer comentário</option>
              </select>
            </label>
            <div>
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Post específico (opcional)</span>
              {loadingMedia ? (
                <p className="text-xs text-[var(--ink-faint)]">Carregando...</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => update("target_media_id", "")}
                    className={`relative aspect-square rounded-lg flex items-center justify-center text-[10px] text-center p-1 ${
                      form.target_media_id === "" ? "ring-2 ring-offset-1 ring-[var(--signal)] bg-[var(--signal-soft)]" : "border border-[var(--border)] opacity-60"
                    }`}
                  >
                    Todos
                  </button>
                  {media.map((m) => (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => update("target_media_id", m.id)}
                      className={`relative aspect-square rounded-lg overflow-hidden ${
                        form.target_media_id === m.id ? "ring-2 ring-offset-1 ring-[var(--signal)]" : "border border-[var(--border)] opacity-60"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {openPanel === "publicReply" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--ink)]">💬 Resposta pública</p>
            <AiToggle form={form} update={update} />
            {!form.ai_enabled && (
              <textarea
                value={form.public_replies}
                onChange={(e) => update("public_replies", e.target.value)}
                className="input"
                rows={4}
                placeholder={"Te mandei no privado! 📩\nJá foi no seu direct!"}
              />
            )}
          </div>
        )}

        {openPanel === "dm" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--ink)]">✉️ DM de boas-vindas</p>
            <AiToggle form={form} update={update} />
            {!form.ai_enabled && (
              <textarea required value={form.welcome_dm_text} onChange={(e) => update("welcome_dm_text", e.target.value)} className="input" rows={3} />
            )}
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Texto do botão de resposta rápida</span>
              <input required value={form.quick_reply_label} onChange={(e) => update("quick_reply_label", e.target.value)} className="input" />
            </label>
          </div>
        )}

        {openPanel === "link" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--ink)]">🔗 Link</p>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Texto antes do link</span>
              <input value={form.link_text} onChange={(e) => update("link_text", e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Rótulo do botão</span>
              <input value={form.link_button_label} onChange={(e) => update("link_button_label", e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">URL</span>
              <input required type="url" value={form.link_url} onChange={(e) => update("link_url", e.target.value)} className="input" placeholder="https://..." />
            </label>
          </div>
        )}

        {openPanel === "reminder" && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-[var(--ink)]">⏰ Lembrete</p>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Texto (opcional)</span>
              <input value={form.reminder_text} onChange={(e) => update("reminder_text", e.target.value)} className="input" placeholder="Ainda dá tempo 😉" />
            </label>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Atraso (minutos)</span>
              <input type="number" min={1} value={form.reminder_delay_minutes} onChange={(e) => update("reminder_delay_minutes", Number(e.target.value))} className="input" />
            </label>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !form.name}
          className="btn btn-primary w-full mt-6"
        >
          {saving ? "Salvando..." : "Criar automação"}
        </button>
      </div>
    </div>
  );
}

function AiToggle({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <div>
      <label className="flex items-center gap-2 text-sm mb-2">
        <input type="checkbox" checked={form.ai_enabled} onChange={(e) => update("ai_enabled", e.target.checked)} />
        Gerar com IA (em vez de texto fixo)
      </label>
      {form.ai_enabled && (
        <input
          value={form.ai_tone}
          onChange={(e) => update("ai_tone", e.target.value)}
          className="input"
          placeholder="Tom da marca (opcional)"
        />
      )}
    </div>
  );
}
