"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ReactFlow,
  Background,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
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

const YSTEP = 160;

export default function FlowBuilder({ automationId }: { automationId?: string }) {
  const router = useRouter();
  const params = useParams<{ accountId: string }>();
  const [saving, setSaving] = useState(false);
  const [media, setMedia] = useState<Media[]>([]);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(!automationId);

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
  const [steps, setSteps] = useState<StepBlock[]>(
    automationId
      ? []
      : [
          {
            id: uid(),
            kind: "button",
            message_text: "Aqui está o link 👇",
            link_url: "",
            link_button_label: "Acessar",
            delay_minutes: 1,
          },
        ]
  );

  const [editing, setEditing] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const initialized = useRef(false);

  useEffect(() => {
    fetch(`/api/media?account_id=${params.accountId}`)
      .then((r) => r.json())
      .then((json) => setMedia(json.data ?? []));
  }, [params.accountId]);

  // modo edição: carrega a automação + a sequência existentes antes de montar o canvas
  useEffect(() => {
    if (!automationId) return;

    Promise.all([
      fetch(`/api/automations/${automationId}`).then((r) => r.json()),
      fetch(`/api/automations/${automationId}/followups`).then((r) => r.json()),
    ]).then(([autoJson, followupsJson]) => {
      const a = autoJson.data;
      if (!a) return;

      setName(a.name ?? "");
      setTrigger({
        trigger_comment: a.trigger_comment ?? true,
        trigger_story_reply: a.trigger_story_reply ?? false,
        trigger_dm: a.trigger_dm ?? false,
        keywords: (a.keywords ?? []).join(", "),
        match_type: a.match_type ?? "contains",
        target_media_id: a.target_media_id ?? "",
      });
      setPublicReply({
        enabled: Boolean(a.public_replies?.length) || Boolean(a.ai_enabled),
        ai_enabled: a.ai_enabled ?? false,
        ai_tone: a.ai_tone ?? "",
        text: a.public_replies?.[0] ?? "",
      });
      setDm({
        ai_enabled: a.ai_enabled ?? false,
        ai_tone: a.ai_tone ?? "",
        text: a.welcome_dm_text ?? "",
        quick_reply_label: a.quick_reply_label ?? "",
      });

      const builtInSteps: StepBlock[] = [];
      if (a.link_url) {
        builtInSteps.push({
          id: uid(),
          kind: "button",
          message_text: a.link_text ?? "Aqui está o link 👇",
          link_url: a.link_url,
          link_button_label: a.link_button_label ?? "Acessar",
          delay_minutes: 1,
        });
      }
      if (a.reminder_text) {
        builtInSteps.push({
          id: uid(),
          kind: "text",
          message_text: a.reminder_text,
          link_url: "",
          link_button_label: "",
          delay_minutes: a.reminder_delay_minutes ?? 60,
        });
      }
      const extraSteps: StepBlock[] = (followupsJson.data ?? []).map((f: any) => ({
        id: uid(),
        kind: f.link_url ? "button" : "text",
        message_text: f.message_text ?? "",
        link_url: f.link_url ?? "",
        link_button_label: f.link_button_label ?? "Acessar",
        delay_minutes: f.delay_minutes ?? 60,
      }));

      setSteps([...builtInSteps, ...extraSteps]);
      setReady(true);
    });
  }, [automationId]);

  // monta o canvas UMA vez (quando os dados já estiverem prontos), com o
  // layout inicial — posição livre depois disso
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;

    const ids = ["trigger", "publicReply", "dm", ...steps.map((s) => s.id)];
    const initialNodes: Node[] = ids.map((id, i) => ({
      id,
      type: "block",
      position: { x: 40, y: i * YSTEP },
      data: {},
    }));
    const initialEdges: Edge[] = [];
    for (let i = 0; i < ids.length - 1; i++) {
      initialEdges.push({
        id: `${ids[i]}-${ids[i + 1]}`,
        source: ids[i],
        target: ids[i + 1],
        style: { stroke: "var(--border-strong)", strokeWidth: 2 },
      });
    }
    setNodes(initialNodes);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function addStep(kind: "text" | "button") {
    const newStep: StepBlock = {
      id: uid(),
      kind,
      message_text: kind === "text" ? "Ainda dá tempo 😉" : "Aqui está 👇",
      link_url: "",
      link_button_label: "Acessar",
      delay_minutes: 60,
    };
    setSteps((prev) => [...prev, newStep]);
    setAddMenuOpen(false);

    // solta o bloco solto no canvas, sem ligar em nada — conecta na mão
    setNodes((nds) => {
      const count = nds.length;
      const col = count % 3;
      const row = Math.floor(count / 3);
      return [
        ...nds,
        {
          id: newStep.id,
          type: "block",
          position: { x: 420 + col * 300, y: 40 + row * YSTEP },
          data: {},
        },
      ];
    });
  }

  function removeStep(id: string) {
    setSteps((prev) => prev.filter((s) => s.id !== id));
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    if (editing === id) setEditing(null);
  }

  function updateStep(id: string, patch: Partial<StepBlock>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge({ ...connection, style: { stroke: "var(--signal)", strokeWidth: 2 } }, eds)
      ),
    [setEdges]
  );

  // sincroniza o CONTEÚDO exibido nos blocos sem mexer na posição deles
  useEffect(() => {
    const triggerLabel = (() => {
      const list: string[] = [];
      if (trigger.trigger_comment) list.push("comentário");
      if (trigger.trigger_story_reply) list.push("story");
      if (trigger.trigger_dm) list.push("dm");
      return `${list.join(" · ") || "sem gatilho"} · "${trigger.keywords || "qualquer"}"`;
    })();

    const dataById: Record<string, any> = {
      trigger: {
        title: "Quando...",
        icon: "⚡",
        preview: triggerLabel,
        onClick: () => setEditing("trigger"),
      },
      publicReply: {
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
      dm: {
        title: "Enviar mensagem",
        icon: "✉️",
        preview: dm.ai_enabled ? "gerada por IA" : dm.text,
        footer: `botão: ${dm.quick_reply_label}`,
        onClick: () => setEditing("dm"),
      },
    };
    steps.forEach((step) => {
      dataById[step.id] = {
        title: step.kind === "button" ? "Enviar mensagem com botão" : "Enviar mensagem",
        icon: step.kind === "button" ? "🔗" : "💌",
        preview: step.message_text,
        footer: `${step.delay_minutes} min depois${
          step.kind === "button" && step.link_url ? ` · ${step.link_button_label}` : ""
        }`,
        onClick: () => setEditing(step.id),
        onRemove: () => removeStep(step.id),
      };
    });

    setNodes((nds) => nds.map((n) => (dataById[n.id] ? { ...n, data: dataById[n.id] } : n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, publicReply, dm, steps, addMenuOpen, media]);

  async function handleSubmit() {
    if (!name.trim()) {
      alert("Dá um nome pra automação primeiro.");
      return;
    }
    setSaving(true);

    const payload: Record<string, unknown> = {
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
      // o link/lembrete "antigos" agora sempre viram passos da sequência,
      // pra não duplicar envio quando a automação já tinha eles
      link_url: null,
      link_text: null,
      link_button_label: null,
      reminder_text: null,
      steps: steps.map((s) => ({
        message_text: s.message_text,
        link_url: s.kind === "button" ? s.link_url : null,
        link_button_label: s.kind === "button" ? s.link_button_label : null,
        delay_minutes: s.delay_minutes,
      })),
    };

    const res = automationId
      ? await fetch(`/api/automations/${automationId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/automations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, account_id: params.accountId }),
        });

    setSaving(false);
    if (res.ok) router.push(`/dashboard/accounts/${params.accountId}`);
    else alert("Erro ao salvar. Tente de novo.");
  }

  if (!ready) {
    return <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>;
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
        <p className="text-xs text-[var(--ink-faint)] hidden lg:block">
          Arraste os blocos, conecte puxando das bolinhas, selecione uma linha e aperte Delete pra desconectar.
        </p>
        <button onClick={handleSubmit} disabled={saving} className="btn btn-primary ml-auto shrink-0">
          {saving ? "Salvando..." : automationId ? "Salvar alterações" : "Criar automação"}
        </button>
      </div>

      <div className="card overflow-hidden h-[calc(100vh-260px)] min-h-[500px] relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
          nodesDraggable
          nodesConnectable
          elementsSelectable
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background gap={20} color="var(--border)" />
        </ReactFlow>

        <div className="absolute bottom-5 right-5 z-10">
          {addMenuOpen && (
            <div className="card p-1.5 w-56 shadow-lg mb-2">
              <button
                onClick={() => addStep("text")}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--paper)] text-[var(--ink)]"
              >
                💌 Mensagem de texto
              </button>
              <button
                onClick={() => addStep("button")}
                className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--paper)] text-[var(--ink)]"
              >
                🔗 Mensagem com botão
              </button>
            </div>
          )}
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            className="w-12 h-12 rounded-full bg-[var(--indigo)] text-white flex items-center justify-center text-2xl shadow-lg hover:opacity-90 ml-auto"
            title="Adicionar bloco"
          >
            +
          </button>
        </div>
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
      <Handle type="target" position={Position.Top} style={{ width: 10, height: 10, background: "var(--indigo)" }} />
      <div
        onClick={data.onClick}
        className={`rounded-xl border overflow-hidden cursor-pointer bg-[var(--surface)] hover:shadow-md transition-shadow ${
          data.muted ? "opacity-50 border-dashed" : "border-[var(--border)]"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--paper)] border-b border-[var(--border)] cursor-grab active:cursor-grabbing">
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
      <Handle type="source" position={Position.Bottom} style={{ width: 10, height: 10, background: "var(--indigo)" }} />
    </div>
  );
}

const nodeTypes = { block: BlockNode };

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
