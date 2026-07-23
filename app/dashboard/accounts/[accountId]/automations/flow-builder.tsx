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

type BlockKind = "publicReply" | "dm" | "text" | "button";

type Block = {
  id: string;
  kind: BlockKind;
  text: string;
  ai_enabled: boolean;
  ai_tone: string;
  quick_reply_label: string; // só usado no kind "dm"
  link_url: string; // só usado no kind "button"
  link_button_label: string; // só usado no kind "button"
  delay_minutes: number; // só usado nos kinds "text" e "button"
  only_if_not_clicked: boolean; // só usado nos kinds "text" e "button"
};

type TriggerData = {
  trigger_comment: boolean;
  trigger_story_reply: boolean;
  trigger_dm: boolean;
  keywords: string;
  match_type: string;
  target_media_id: string;
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Segue de verdade as linhas que a pessoa desenhou no canvas, a partir
 * do bloco "Quando...", pra descobrir a ordem real da automação. Blocos
 * soltos (sem linha ligando no fluxo) ficam de fora do salvamento —
 * eles ainda são "rascunho" até serem conectados.
 */
function getConnectedOrder(edges: Edge[], blocks: Block[]): Block[] {
  const bySource: Record<string, string[]> = {};
  edges.forEach((e) => {
    (bySource[e.source] ||= []).push(e.target);
  });

  const visited = new Set<string>();
  const order: string[] = [];
  const queue = ["trigger"];

  while (queue.length) {
    const current = queue.shift()!;
    for (const child of bySource[current] ?? []) {
      if (!visited.has(child)) {
        visited.add(child);
        order.push(child);
        queue.push(child);
      }
    }
  }

  const byId = new Map(blocks.map((b) => [b.id, b]));
  return order.map((id) => byId.get(id)).filter((b): b is Block => Boolean(b));
}

function newBlock(kind: BlockKind): Block {
  const base: Block = {
    id: uid(),
    kind,
    text: "",
    ai_enabled: false,
    ai_tone: "",
    quick_reply_label: "Quero o link",
    link_url: "",
    link_button_label: "Acessar",
    delay_minutes: 60,
    only_if_not_clicked: false,
  };
  if (kind === "publicReply") base.text = "Te mandei no privado! 📩";
  if (kind === "dm") base.text = "Oi! Toque no botão abaixo pra continuar 👇";
  if (kind === "text") base.text = "Ainda dá tempo 😉";
  if (kind === "button") {
    base.text = "Aqui está 👇";
    base.delay_minutes = 1;
  }
  return base;
}

const BLOCK_META: Record<BlockKind, { icon: string; title: string }> = {
  publicReply: { icon: "💬", title: "Resposta pública" },
  dm: { icon: "✉️", title: "Enviar mensagem" },
  text: { icon: "💌", title: "Mensagem de texto" },
  button: { icon: "🔗", title: "Mensagem com botão" },
};

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
  const [blocks, setBlocks] = useState<Block[]>([]);

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

      const loaded: Block[] = [];

      if (a.ai_enabled) {
        loaded.push({ ...newBlock("publicReply"), ai_enabled: true, ai_tone: a.ai_tone ?? "" });
      } else {
        for (const text of a.public_replies ?? []) {
          loaded.push({ ...newBlock("publicReply"), text });
        }
      }

      if (a.welcome_dm_text || a.quick_reply_label || a.ai_enabled) {
        loaded.push({
          ...newBlock("dm"),
          text: a.welcome_dm_text ?? "",
          quick_reply_label: a.quick_reply_label ?? "",
          ai_enabled: a.ai_enabled ?? false,
          ai_tone: a.ai_tone ?? "",
        });
      }

      if (a.link_url) {
        loaded.push({
          ...newBlock("button"),
          text: a.link_text ?? "Aqui está o link 👇",
          link_url: a.link_url,
          link_button_label: a.link_button_label ?? "Acessar",
          delay_minutes: 1,
        });
      }
      if (a.reminder_text) {
        loaded.push({
          ...newBlock("text"),
          text: a.reminder_text,
          delay_minutes: a.reminder_delay_minutes ?? 60,
        });
      }
      for (const f of followupsJson.data ?? []) {
        loaded.push({
          ...newBlock(f.link_url ? "button" : "text"),
          text: f.message_text ?? "",
          link_url: f.link_url ?? "",
          link_button_label: f.link_button_label ?? "Acessar",
          delay_minutes: f.delay_minutes ?? 60,
          only_if_not_clicked: f.only_if_not_clicked ?? false,
        });
      }

      setBlocks(loaded);
      setReady(true);
    });
  }, [automationId]);

  // monta o canvas UMA vez (quando os dados já estiverem prontos) — nova
  // automação nasce só com o bloco "Quando...", edição carrega tudo já
  // encadeado; depois disso a posição/ligação é livre
  useEffect(() => {
    if (!ready || initialized.current) return;
    initialized.current = true;

    const ids = ["trigger", ...blocks.map((b) => b.id)];
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

  function addBlock(kind: BlockKind) {
    const block = newBlock(kind);
    setBlocks((prev) => [...prev, block]);
    setAddMenuOpen(false);

    // solta o bloco solto no canvas, sem ligar em nada — conecta na mão
    setNodes((nds) => {
      const count = nds.length;
      const col = count % 3;
      const row = Math.floor(count / 3);
      return [
        ...nds,
        { id: block.id, type: "block", position: { x: 420 + col * 300, y: 40 + row * YSTEP }, data: {} },
      ];
    });
    setEditing(block.id);
  }

  function removeBlock(id: string) {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    if (editing === id) setEditing(null);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
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
    };

    const connectedIds = new Set(getConnectedOrder(edges, blocks).map((b) => b.id));

    blocks.forEach((block) => {
      const meta = BLOCK_META[block.kind];
      const footerParts: string[] = [];
      if (block.kind === "dm") footerParts.push(`botão: ${block.quick_reply_label}`);
      if (block.kind === "text" || block.kind === "button") {
        footerParts.push(block.delay_minutes === 0 ? "sem atraso" : `${block.delay_minutes} min depois`);
      }
      if (block.kind === "button" && block.link_url) footerParts.push(block.link_button_label);

      dataById[block.id] = {
        title: meta.title,
        icon: meta.icon,
        preview: block.ai_enabled ? "gerada por IA" : block.text || "sem texto",
        footer: connectedIds.has(block.id)
          ? footerParts.join(" · ")
          : "⚠ não conectado — não vai ser salvo",
        muted: !connectedIds.has(block.id),
        onClick: () => setEditing(block.id),
        onRemove: () => removeBlock(block.id),
      };
    });

    setNodes((nds) => nds.map((n) => (dataById[n.id] ? { ...n, data: dataById[n.id] } : n)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, blocks, media, edges]);

  async function handleSubmit() {
    if (!name.trim()) {
      alert("Dá um nome pra automação primeiro.");
      return;
    }

    const orderedBlocks = getConnectedOrder(edges, blocks);
    const unconnectedCount = blocks.length - orderedBlocks.length;
    if (unconnectedCount > 0) {
      const proceed = confirm(
        `${unconnectedCount} bloco(s) ainda não estão conectados ao fluxo (a partir do "Quando..."). Eles não vão ser salvos. Quer continuar mesmo assim?`
      );
      if (!proceed) return;
    }

    setSaving(true);

    const publicReplyBlocks = orderedBlocks.filter((b) => b.kind === "publicReply");
    const dmBlock = orderedBlocks.find((b) => b.kind === "dm");
    const stepBlocks = orderedBlocks.filter((b) => b.kind === "text" || b.kind === "button");

    const aiEnabled = publicReplyBlocks.some((b) => b.ai_enabled) || Boolean(dmBlock?.ai_enabled);
    const aiTone = publicReplyBlocks.find((b) => b.ai_tone)?.ai_tone || dmBlock?.ai_tone || "";

    const payload: Record<string, unknown> = {
      name,
      trigger_comment: trigger.trigger_comment,
      trigger_story_reply: trigger.trigger_story_reply,
      trigger_dm: trigger.trigger_dm,
      keywords: trigger.keywords.split(",").map((k) => k.trim()).filter(Boolean),
      match_type: trigger.match_type,
      target_media_id: trigger.target_media_id || null,
      public_replies: publicReplyBlocks.filter((b) => !b.ai_enabled).map((b) => b.text),
      welcome_dm_text: dmBlock?.text ?? "",
      quick_reply_label: dmBlock?.quick_reply_label ?? "",
      ai_enabled: aiEnabled,
      ai_tone: aiTone,
      link_url: null,
      link_text: null,
      link_button_label: null,
      reminder_text: null,
      steps: stepBlocks.map((b) => ({
        message_text: b.text,
        link_url: b.kind === "button" ? b.link_url : null,
        link_button_label: b.kind === "button" ? b.link_button_label : null,
        delay_minutes: b.delay_minutes,
        only_if_not_clicked: b.only_if_not_clicked,
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

  const editingBlock = blocks.find((b) => b.id === editing);

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

        <div className="absolute top-5 right-5 z-10">
          <button
            onClick={() => setAddMenuOpen((o) => !o)}
            className="w-12 h-12 rounded-full bg-[var(--indigo)] text-white flex items-center justify-center text-2xl shadow-lg hover:opacity-90 ml-auto"
            title="Adicionar bloco"
          >
            +
          </button>
          {addMenuOpen && (
            <div className="card p-1.5 w-56 shadow-lg mt-2 ml-auto">
              {(Object.keys(BLOCK_META) as BlockKind[]).map((kind) => (
                <button
                  key={kind}
                  onClick={() => addBlock(kind)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-[var(--paper)] text-[var(--ink)]"
                >
                  {BLOCK_META[kind].icon} {BLOCK_META[kind].title}
                </button>
              ))}
            </div>
          )}
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

      {editingBlock && (
        <EditModal
          title={`${BLOCK_META[editingBlock.kind].icon} ${BLOCK_META[editingBlock.kind].title}`}
          onClose={() => setEditing(null)}
          onDelete={() => removeBlock(editingBlock.id)}
        >
          {(editingBlock.kind === "publicReply" || editingBlock.kind === "dm") && (
            <AiToggle
              aiEnabled={editingBlock.ai_enabled}
              tone={editingBlock.ai_tone}
              onAiChange={(v) => updateBlock(editingBlock.id, { ai_enabled: v })}
              onToneChange={(v) => updateBlock(editingBlock.id, { ai_tone: v })}
            />
          )}
          {!editingBlock.ai_enabled && (
            <Field label="Texto">
              <textarea
                value={editingBlock.text}
                onChange={(e) => updateBlock(editingBlock.id, { text: e.target.value })}
                className="input"
                rows={3}
              />
            </Field>
          )}
          {editingBlock.kind === "dm" && (
            <Field label="Texto do botão de resposta rápida">
              <input
                required
                value={editingBlock.quick_reply_label}
                onChange={(e) => updateBlock(editingBlock.id, { quick_reply_label: e.target.value })}
                className="input"
              />
            </Field>
          )}
          {editingBlock.kind === "button" && (
            <>
              <Field label="URL do botão">
                <input
                  type="url"
                  value={editingBlock.link_url}
                  onChange={(e) => updateBlock(editingBlock.id, { link_url: e.target.value })}
                  className="input"
                  placeholder="https://..."
                />
              </Field>
              <Field label="Rótulo do botão">
                <input
                  value={editingBlock.link_button_label}
                  onChange={(e) => updateBlock(editingBlock.id, { link_button_label: e.target.value })}
                  className="input"
                />
              </Field>
            </>
          )}
          {(editingBlock.kind === "text" || editingBlock.kind === "button") && (
            <div className="mb-3">
              <label className="flex items-center gap-2 text-sm mb-2">
                <input
                  type="checkbox"
                  checked={editingBlock.delay_minutes === 0}
                  onChange={(e) =>
                    updateBlock(editingBlock.id, { delay_minutes: e.target.checked ? 0 : 60 })
                  }
                />
                Enviar imediatamente (sem atraso)
              </label>
              {editingBlock.delay_minutes !== 0 && (
                <Field label="Atraso (minutos, a partir de quando a pessoa abre a conversa)">
                  <input
                    type="number"
                    min={1}
                    value={editingBlock.delay_minutes}
                    onChange={(e) => updateBlock(editingBlock.id, { delay_minutes: Number(e.target.value) })}
                    className="input"
                  />
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm mt-2">
                <input
                  type="checkbox"
                  checked={editingBlock.only_if_not_clicked}
                  onChange={(e) => updateBlock(editingBlock.id, { only_if_not_clicked: e.target.checked })}
                />
                Só enviar se a pessoa ainda não clicou no link
              </label>
              {editingBlock.only_if_not_clicked && (
                <p className="text-xs text-[var(--ink-faint)] mt-1">
                  Na hora de enviar, o sistema confere se já teve clique registrado nesse
                  contato pra essa automação. Se já clicou, esse passo é pulado.
                </p>
              )}
            </div>
          )}
        </EditModal>
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
