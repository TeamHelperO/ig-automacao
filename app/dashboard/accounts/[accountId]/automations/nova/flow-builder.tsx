"use client";

import { useEffect, useMemo, useState } from "react";
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
};

type StepBlock = {
  id: string;
  kind: "text" | "button";
  message_text: string;
  link_url: string;
  link_button_label: string;
  delay_minutes: number;
};

type TriggerData = {
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
  keywords: string;
  match_type: string;
  target_media_id: string;
};

type ReplyData = {
  enabled: boolean;
  ai_enabled: boolean;
  ai_tone: string;
  text: string;
};

type DmData = {
  ai_enabled: boolean;
  ai_tone: string;
  text: string;
  quick_reply_label: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const YSTEP = 150;

export default function FlowBuilder() {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [name, setName] = useState("");

  const [trigger, setTrigger] = useState<TriggerData>({
    trigger_comment: true,
    trigger_story_reply: false,
    trigger_dm: false,
    keywords: "",
    match_type: "contains",
    target_media_id: "",
  });
  const [publicReply, setPublicReply] = useState<ReplyData>({
    enabled: true,
    ai_enabled: false,
    ai_tone: "",
    text: "Te mandei no privado! 📩",
  });
  const [dm, setDm] = useState<DmData>({
    ai_enabled: false,
    ai_tone: "",
    text: "Oi! Toque no botão abaixo pra continuar 👇",
    quick_reply_label: "Quero o link",
  });
  const [steps, setSteps] = useState<StepBlock[]>([
    {
      id: uid(),
      kind: "button",
      message_text: "Aqui está o link 👇",
      link_url: "",
      link_button_label: "Acessar",
      delay_minutes: 1,
    },
  ]);

  const [editing, setEditing] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/media?account_id=${params.accountId}`)
      .then((r) => r.json())
      .then((json) => setMedia(json.data ?? []));
  }, [params.accountId]);

  function addStep(kind: "text" | "button") {
    setSteps((prev) => [
      ...prev,
      {
        id: uid(),
        kind,
        message_text: kind === "text" ? "Ainda dá tempo 😉" : "Aqui está 👇",
        link_url: "",
        link_button_label: "Acessar",
        delay_minutes: 60,
      },
    ]);
    setAddMenuOpen(false);
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    if (editing === id) setEditing(null);
  }

  function updateStep(id: string, patch: Partial<StepBlock>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  const triggerLabel = useMemo(() => {
    const list: string[] = [];
    if (trigger.trigger_comment) list.push("comentário");
    if (trigger.trigger_story_reply) list.push("story");
    if (trigger.trigger_dm) list.push("dm");
    return `${list.join(" · ") || "sem gatilho"} · "${trigger.keywords || "qualquer"}"`;
  }, [trigger]);

  const nodes: Node[] = useMemo(() => {
    let y = 0;
    const list: Node[] = [];

    list.push({
      id: "trigger",
      type: "block",
      position: { x: 40, y },
      data: {
        kind: "trigger",
        title: "Quando...",
        icon: "⚡",
        preview: triggerLabel,
        onClick: () => setEditing("trigger"),
      },
    });
    y += YSTEP;

    list.push({
      id: "publicReply",
      type: "block",
      position: { x: 40, y },
      data: {
        kind: "publicReply",
        title: "Resposta pública",
        icon: "💬",
        preview: !publicReply.enabled
          ? "desativada"
          : publicReply.ai_enabled
          ? "gerada por IA"
          : publicReply.text,
        muted: !publicReply.enabled,
        onClick: () => setEditing("publicReply"),
      },
    });
    y += YSTEP;

    list.push({
      id: "dm",
      type: "block",
      position: { x: 40, y },
      data: {
        kind: "dm",
        title: "Enviar mensagem",
        icon: "✉️",
        preview: dm.ai_enabled ? "gerada por IA" : dm.text,
        footer: `botão: ${dm.quick_reply_label}`,
        onClick: () => setEditing("dm"),
      },
    });
    y += YSTEP;

    steps.forEach((step) => {
      list.push({
        id: step.id,
        type: "block",
        position: { x: 40, y },
        data: {
          kind: "step",
          title: step.kind === "button" ? "Enviar mensagem com botão" : "Enviar mensagem",
          icon: step.kind === "button" ? "🔗" : "💌",
          preview: step.message_text,
          footer: `${step.delay_minutes} min depois${
            step.kind === "button" && step.link_url ? ` · ${step.link_button_label}` : ""
          }`,
          onClick: () => setEditing(step.id),
          onRemove: () => removeStep(step.id),
        },
      });
      y += YSTEP;
    });

    list.push({
      id: "add",
      type: "add",
      position: { x: 40, y },
      data: { onClick: () => setAddMenuOpen((o) => !o), open: addMenuOpen, addStep },
    });

    return list;
  }, [triggerLabel, publicReply, dm, steps, addMenuOpen]);

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
    if (!name.trim()) {
      alert("Dá um nome pra automação primeiro.");
      return;
    }
    setSaving(true);

    const res = await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account_id: params.accountId,
        name,
        trigger_comment: trigger.trigger_comment,
        trigger_story_reply: trigger.trigger_story_reply,
        trigger_dm: trigger.trigger_dm,
        keywords: trigger.keywords.split(",").map((k) => k.trim()).filter(Boolean),
        match_type: trigger.match_type,
        target_media_id: trigger.target_media_id || null,
        public_replies: publicReply.enabled && !publicReply.ai_enabled ? [publicReply.text] : [],
        welcome_dm_text: dm.text,
        quick_reply_label: dm.quick_reply_label,
        ai_enabled: dm.ai_enabled || publicReply.ai_enabled,
        ai_tone: dm.ai_tone || publicReply.ai_tone,
        steps: steps.map((s) => ({
          message_text: s.message_text,
          link_url: s.kind === "button" ? s.link_url : null,
          link_button_label: s.kind === "button" ? s.link_button_label : null,
          delay_minutes: s.delay_minutes,
        })),
      }),
    });

    setSaving(false);
    if (res.ok) router.push(`/dashboard/accounts/${params.accountId}`);
    else alert("Erro ao salvar. Tente de novo.");
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da automação"
          className="input max-w-xs"
        />
        <button onClick={handleSubmit} disabled={saving} className="btn btn-primary ml-auto">
          {saving ? "Salvando..." : "Criar automação"}
        </button>
      </div>

      <div className="card overflow-hidden h-[calc(100vh-260px)] min-h-[500px] relative">
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

      {editing === "trigger" && (
        <EditModal title="⚡ Quando..." onClose={() => setEditing(null)}>
          <div className="flex flex-col gap-2 text-sm mb-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={trigger.trigger_comment} onChange={(e) => setTrigger((t) => ({ ...t, trigger_comment: e.target.checked }))} />
              Comentário em post/reels
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={trigger.trigger_story_reply} onChange={(e) => setTrigger((t) => ({ ...t, trigger_story_reply: e.target.checked }))} />
              Resposta a story
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={trigger.trigger_dm} onChange={(e) => setTrigger((t) => ({ ...t, trigger_dm: e.target.checked }))} />
              DM direta
            </label>
          </div>
          <Field label="Palavras-chave (vírgula)">
            <input value={trigger.keywords} onChange={(e) => setTrigger((t) => ({ ...t, keywords: e.target.value }))} className="input" placeholder="quero, eu quero" />
          </Field>
          <Field label="Correspondência">
            <select value={trigger.match_type} onChange={(e) => setTrigger((t) => ({ ...t, match_type: e.target.value }))} className="input">
              <option value="contains">Contém a palavra</option>
              <option value="exact">É exatamente a palavra</option>
              <option value="any">Qualquer comentário</option>
            </select>
          </Field>
          <div>
            <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Post específico (opcional)</span>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setTrigger((t) => ({ ...t, target_media_id: "" }))}
                className={`aspect-square rounded-lg text-[10px] flex items-center justify-center text-center p-1 ${
                  trigger.target_media_id === "" ? "ring-2 ring-[var(--signal)] bg-[var(--signal-soft)]" : "border border-[var(--border)] opacity-60"
                }`}
              >
                Todos
              </button>
              {media.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTrigger((t) => ({ ...t, target_media_id: m.id }))}
                  className={`aspect-square rounded-lg overflow-hidden ${
                    trigger.target_media_id === m.id ? "ring-2 ring-[var(--signal)]" : "border border-[var(--border)] opacity-60"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumbnail_url || m.media_url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </EditModal>
      )}

      {editing === "publicReply" && (
        <EditModal title="💬 Resposta pública" onClose={() => setEditing(null)}>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={publicReply.enabled} onChange={(e) => setPublicReply((p) => ({ ...p, enabled: e.target.checked }))} />
            Responder publicamente no comentário
          </label>
          {publicReply.enabled && (
            <>
              <AiToggle
                aiEnabled={publicReply.ai_enabled}
                tone={publicReply.ai_tone}
                onAiChange={(v) => setPublicReply((p) => ({ ...p, ai_enabled: v }))}
                onToneChange={(v) => setPublicReply((p) => ({ ...p, ai_tone: v }))}
              />
              {!publicReply.ai_enabled && (
                <Field label="Texto">
                  <textarea value={publicReply.text} onChange={(e) => setPublicReply((p) => ({ ...p, text: e.target.value }))} className="input" rows={3} />
                </Field>
              )}
            </>
          )}
        </EditModal>
      )}

      {editing === "dm" && (
        <EditModal title="✉️ Enviar mensagem" onClose={() => setEditing(null)}>
          <AiToggle
            aiEnabled={dm.ai_enabled}
            tone={dm.ai_tone}
            onAiChange={(v) => setDm((d) => ({ ...d, ai_enabled: v }))}
            onToneChange={(v) => setDm((d) => ({ ...d, ai_tone: v }))}
          />
          {!dm.ai_enabled && (
            <Field label="Texto">
              <textarea required value={dm.text} onChange={(e) => setDm((d) => ({ ...d, text: e.target.value }))} className="input" rows={3} />
            </Field>
          )}
          <Field label="Texto do botão de resposta rápida">
            <input required value={dm.quick_reply_label} onChange={(e) => setDm((d) => ({ ...d, quick_reply_label: e.target.value }))} className="input" />
          </Field>
        </EditModal>
      )}

      {steps.map(
        (step) =>
          editing === step.id && (
            <EditModal
              key={step.id}
              title={step.kind === "button" ? "🔗 Mensagem com botão" : "💌 Mensagem de texto"}
              onClose={() => setEditing(null)}
              onDelete={() => removeStep(step.id)}
            >
              <Field label="Texto">
                <textarea value={step.message_text} onChange={(e) => updateStep(step.id, { message_text: e.target.value })} className="input" rows={3} />
              </Field>
              {step.kind === "button" && (
                <>
                  <Field label="URL do botão">
                    <input type="url" value={step.link_url} onChange={(e) => updateStep(step.id, { link_url: e.target.value })} className="input" placeholder="https://..." />
                  </Field>
                  <Field label="Rótulo do botão">
                    <input value={step.link_button_label} onChange={(e) => updateStep(step.id, { link_button_label: e.target.value })} className="input" />
                  </Field>
                </>
              )}
              <Field label="Atraso (minutos, a partir de quando a pessoa abre a conversa)">
                <input
                  type="number"
                  min={1}
                  value={step.delay_minutes}
                  onChange={(e) => updateStep(step.id, { delay_minutes: Number(e.target.value) })}
                  className="input"
                />
              </Field>
            </EditModal>
          )
      )}
    </div>
  );
}

// ---------------------------------------------------------
// Blocos do canvas
// ---------------------------------------------------------

function BlockNode({ data }: { data: any }) {
  return (
    <div className="w-72">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        onClick={data.onClick}
        className={`rounded-xl border overflow-hidden cursor-pointer bg-[var(--surface)] hover:shadow-md transition-shadow ${
          data.muted ? "opacity-50 border-dashed" : "border-[var(--border)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper)] border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <span className="text-base">{data.icon}</span>
            <span className="text-xs font-medium text-[var(--ink-soft)]">{data.title}</span>
          </div>
          {data.onRemove && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                data.onRemove();
              }}
              className="text-[var(--ink-faint)] hover:text-[var(--coral)] text-xs"
            >
              ✕
            </button>
          )}
        </div>
        <div className="px-3 py-3">
          <p className="text-sm text-[var(--ink)] line-clamp-3">{data.preview}</p>
          {data.footer && <p className="text-xs text-[var(--ink-faint)] mt-1.5 mono">{data.footer}</p>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </div>
  );
}

function AddNode({ data }: { data: any }) {
  return (
    <div className="relative flex flex-col items-center">
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <button
        onClick={data.onClick}
        className="w-9 h-9 rounded-full bg-[var(--indigo)] text-white flex items-center justify-center text-lg shadow hover:opacity-90"
      >
        +
      </button>
      {data.open && (
        <div className="absolute top-11 card p-1.5 w-56 z-10 shadow-lg">
          <button
            onClick={() => data.addStep("text")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--paper)] text-[var(--ink)]"
          >
            💌 Mensagem de texto
          </button>
          <button
            onClick={() => data.addStep("button")}
            className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--paper)] text-[var(--ink)]"
          >
            🔗 Mensagem com botão
          </button>
        </div>
      )}
    </div>
  );
}

const nodeTypes = { block: BlockNode, add: AddNode };

// ---------------------------------------------------------
// Modal de edição
// ---------------------------------------------------------

function EditModal({
  title,
  onClose,
  onDelete,
  children,
}: {
  title: string;
  onClose: () => void;
  onDelete?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-medium text-[var(--ink)]">{title}</p>
          <button onClick={onClose} className="text-[var(--ink-faint)]">
            ✕
          </button>
        </div>
        {children}
        <div className="flex items-center justify-between mt-4">
          {onDelete ? (
            <button onClick={onDelete} className="btn-danger-text text-xs">
              Excluir bloco
            </button>
          ) : (
            <span />
          )}
          <button onClick={onClose} className="btn btn-primary">
            Pronto
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-3">
      <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function AiToggle({
  aiEnabled,
  tone,
  onAiChange,
  onToneChange,
}: {
  aiEnabled: boolean;
  tone: string;
  onAiChange: (v: boolean) => void;
  onToneChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="flex items-center gap-2 text-sm mb-2">
        <input type="checkbox" checked={aiEnabled} onChange={(e) => onAiChange(e.target.checked)} />
        Gerar com IA (em vez de texto fixo)
      </label>
      {aiEnabled && (
        <input value={tone} onChange={(e) => onToneChange(e.target.value)} className="input" placeholder="Tom da marca (opcional)" />
      )}
    </div>
  );
}
