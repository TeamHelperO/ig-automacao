import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifyMetaSignature } from "@/lib/verify-signature";
import { supabaseAdmin } from "@/lib/supabase";
import { enqueue, drainQueue } from "@/lib/queue";

// ---------------------------------------------------------
// GET: handshake de verificação do webhook (a Meta chama isso
// uma vez quando você salva a URL de callback no painel).
// ---------------------------------------------------------
export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.IG_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

// ---------------------------------------------------------
// POST: eventos reais (comments, messages)
// ---------------------------------------------------------
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.IG_APP_SECRET!;

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  // Responde rápido (a Meta espera 200 em poucos segundos) e processa
  // o resto depois, no mesmo request, via after().
  after(async () => {
    try {
      await processWebhookBody(body);
    } catch (err) {
      console.error("Erro processando webhook:", err);
    } finally {
      // dispara a drenagem da fila pra parecer instantâneo; a trava
      // atômica em drainQueue() garante que não haverá envio em dobro
      // mesmo que o pg_cron rode quase ao mesmo tempo.
      try {
        await drainQueue();
      } catch (err) {
        console.error("Erro drenando fila após webhook:", err);
      }
    }
  });

  return NextResponse.json({ ok: true });
}

// ---------------------------------------------------------
// Lógica de negócio
// ---------------------------------------------------------

async function processWebhookBody(body: any) {
  for (const entry of body.entry ?? []) {
    // Comentários chegam em entry.changes com field 'comments'
    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        await handleComment(change.value);
      }
    }
    // Mensagens (DM normal, resposta a story, resposta ao botão
    // de resposta rápida) chegam em entry.messaging
    for (const messaging of entry.messaging ?? []) {
      await handleMessaging(messaging);
    }
  }
}

async function logEvent(eventType: string, raw: unknown, note?: string) {
  await supabaseAdmin.from("events").insert({
    event_type: eventType,
    raw: raw as any,
    note,
  });
}

async function getActiveAutomations() {
  const { data } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("active", true);
  return data ?? [];
}

function matchesKeyword(
  text: string,
  keywords: string[],
  matchType: string
): boolean {
  if (matchType === "any") return keywords.length === 0 || true;
  const normalized = text.toLowerCase().trim();
  return keywords.some((kw) => {
    const k = kw.toLowerCase().trim();
    return matchType === "exact" ? normalized === k : normalized.includes(k);
  });
}

async function upsertContact(igScopedId: string, username?: string) {
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("ig_scoped_id", igScopedId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabaseAdmin
    .from("contacts")
    .insert({ ig_scoped_id: igScopedId, username })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar contato: ${error.message}`);
  return created;
}

function randomFrom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Comentário em post/reels ---
async function handleComment(value: any) {
  await logEvent("comment", value);

  const commentId: string | undefined = value?.id;
  const commentText: string | undefined = value?.text;
  const mediaId: string | undefined = value?.media?.id;
  const fromId: string | undefined = value?.from?.id;
  const fromUsername: string | undefined = value?.from?.username;

  if (!commentId || !commentText || !fromId) return;

  const automations = await getActiveAutomations();

  for (const automation of automations) {
    if (!automation.trigger_comment) continue;
    if (automation.target_media_id && automation.target_media_id !== mediaId) continue;
    if (!matchesKeyword(commentText, automation.keywords, automation.match_type)) continue;

    const contact = await upsertContact(fromId, fromUsername);

    // Resposta privada FURA a janela de 24h: 1x por comentário, válida
    // por até 7 dias a partir de agora.
    const windowExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await enqueue({
      contactId: contact.id,
      automationId: automation.id,
      kind: "private_reply",
      recipient: { comment_id: commentId },
      payload: buildWelcomePayload(automation),
      windowExpiresAt,
    });

    // resposta pública opcional, sorteando entre variações
    if (automation.public_replies?.length) {
      const text = randomFrom(automation.public_replies as string[]);
      if (text) {
        await enqueue({
          contactId: contact.id,
          automationId: automation.id,
          kind: "public_reply",
          recipient: { comment_id: commentId },
          payload: { text },
        });
      }
    }

    await supabaseAdmin
      .from("contacts")
      .update({ last_automation_id: automation.id })
      .eq("id", contact.id);

    break; // primeira automação que casar, só ela dispara
  }
}

// --- Mensagem (DM normal, resposta a story, ou resposta ao quick reply) ---
async function handleMessaging(messaging: any) {
  const senderId: string | undefined = messaging?.sender?.id;
  const message = messaging?.message;
  if (!senderId || !message) return;

  const isStoryReply = Boolean(message?.reply_to?.story);
  const quickReplyPayload: string | undefined = message?.quick_reply?.payload;
  const text: string | undefined = message?.text;

  await logEvent(isStoryReply ? "story_reply" : "message", messaging);

  const contact = await upsertContact(senderId);

  // Se veio um payload de quick reply, é a pessoa "tocando no botão":
  // isso ABRE a janela de 24h e dispara os follow-ups configurados.
  if (quickReplyPayload) {
    await supabaseAdmin
      .from("contacts")
      .update({ last_response_at: new Date().toISOString() })
      .eq("id", contact.id);

    await scheduleFollowups(contact, quickReplyPayload);
    return;
  }

  // Caso contrário, é uma DM comum ou resposta a story: se casar
  // alguma automação com o gatilho correspondente, manda a DM de
  // boas-vindas direto (a conversa já está aberta, não precisa de
  // resposta privada).
  if (!text) return;

  const automations = await getActiveAutomations();
  for (const automation of automations) {
    const triggerOk = isStoryReply
      ? automation.trigger_story_reply
      : automation.trigger_dm;
    if (!triggerOk) continue;
    if (!matchesKeyword(text, automation.keywords, automation.match_type)) continue;

    await enqueue({
      contactId: contact.id,
      automationId: automation.id,
      kind: "dm",
      recipient: { id: senderId },
      payload: buildWelcomePayload(automation),
    });

    await supabaseAdmin
      .from("contacts")
      .update({ last_automation_id: automation.id })
      .eq("id", contact.id);

    break;
  }
}

function buildWelcomePayload(automation: any) {
  const quickReplies = automation.quick_reply_label
    ? [{ title: automation.quick_reply_label, payload: `automation:${automation.id}` }]
    : undefined;

  return {
    text: automation.welcome_dm_text ?? "Oi! Toque no botão abaixo pra continuar 👇",
    quickReplies,
  };
}

async function scheduleFollowups(contact: any, payload: string) {
  const automationId = payload.startsWith("automation:")
    ? payload.replace("automation:", "")
    : contact.last_automation_id;

  if (!automationId) return;

  const { data: automation } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .maybeSingle();

  if (!automation) return;

  const windowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (automation.link_url) {
    await enqueue({
      contactId: contact.id,
      automationId: automation.id,
      kind: "link",
      recipient: { id: contact.ig_scoped_id },
      payload: {
        buttonUrl: {
          text: automation.link_text ?? "Aqui está o link 👇",
          buttonLabel: automation.link_button_label ?? "Acessar",
          url: automation.link_url,
        },
      },
      windowExpiresAt,
    });
  }

  if (automation.reminder_text) {
    const delayMs = (automation.reminder_delay_minutes ?? 60) * 60 * 1000;
    await enqueue({
      contactId: contact.id,
      automationId: automation.id,
      kind: "reminder",
      recipient: { id: contact.ig_scoped_id },
      payload: { text: automation.reminder_text },
      sendAfter: new Date(Date.now() + delayMs),
      windowExpiresAt: new Date(Date.now() + delayMs + 24 * 60 * 60 * 1000),
    });
  }
}
