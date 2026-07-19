import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifyMetaSignature } from "@/lib/verify-signature";
import { supabaseAdmin } from "@/lib/supabase";
import { enqueue, drainQueue } from "@/lib/queue";

// ---------------------------------------------------------
// GET: handshake de verificação do webhook
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
// POST: eventos reais (comments, messages), de QUALQUER conta
// conectada por QUALQUER cliente — a Meta manda tudo pro mesmo
// app, então cada entry.id nos diz de qual conta é o evento.
// ---------------------------------------------------------
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const appSecret = process.env.IG_APP_SECRET!;

  if (!verifyMetaSignature(rawBody, signature, appSecret)) {
    return new NextResponse("Assinatura inválida", { status: 401 });
  }

  const body = JSON.parse(rawBody);

  after(async () => {
    try {
      await processWebhookBody(body);
    } catch (err) {
      console.error("Erro processando webhook:", err);
    } finally {
      try {
        await drainQueue();
      } catch (err) {
        console.error("Erro drenando fila após webhook:", err);
      }
    }
  });

  return NextResponse.json({ ok: true });
}

async function processWebhookBody(body: any) {
  for (const entry of body.entry ?? []) {
    const igUserId: string | undefined = entry.id;
    if (!igUserId) continue;

    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("ig_user_id", igUserId)
      .maybeSingle();

    if (!account) continue; // evento de uma conta que não está mais conectada

    for (const change of entry.changes ?? []) {
      if (change.field === "comments") {
        await handleComment(account, change.value);
      }
    }
    for (const messaging of entry.messaging ?? []) {
      await handleMessaging(account, messaging);
    }
  }
}

async function logEvent(accountId: string, eventType: string, raw: unknown) {
  await supabaseAdmin.from("events").insert({
    account_id: accountId,
    event_type: eventType,
    raw: raw as any,
  });
}

async function getActiveAutomations(accountId: string) {
  const { data } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("account_id", accountId)
    .eq("active", true);
  return data ?? [];
}

function matchesKeyword(text: string, keywords: string[], matchType: string): boolean {
  if (matchType === "any") return true;
  const normalized = text.toLowerCase().trim();
  return keywords.some((kw) => {
    const k = kw.toLowerCase().trim();
    return matchType === "exact" ? normalized === k : normalized.includes(k);
  });
}

async function upsertContact(accountId: string, igScopedId: string, username?: string) {
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("account_id", accountId)
    .eq("ig_scoped_id", igScopedId)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabaseAdmin
    .from("contacts")
    .insert({ account_id: accountId, ig_scoped_id: igScopedId, username })
    .select("*")
    .single();

  if (error) throw new Error(`Falha ao criar contato: ${error.message}`);
  return created;
}

function randomFrom<T>(arr: T[]): T | undefined {
  if (!arr.length) return undefined;
  return arr[Math.floor(Math.random() * arr.length)];
}

async function handleComment(account: any, value: any) {
  await logEvent(account.id, "comment", value);

  const commentId: string | undefined = value?.id;
  const commentText: string | undefined = value?.text;
  const mediaId: string | undefined = value?.media?.id;
  const fromId: string | undefined = value?.from?.id;
  const fromUsername: string | undefined = value?.from?.username;

  if (!commentId || !commentText || !fromId) return;

  const automations = await getActiveAutomations(account.id);

  for (const automation of automations) {
    if (!automation.trigger_comment) continue;
    if (automation.target_media_id && automation.target_media_id !== mediaId) continue;
    if (!matchesKeyword(commentText, automation.keywords, automation.match_type)) continue;

    const contact = await upsertContact(account.id, fromId, fromUsername);
    const windowExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await enqueue({
      accountId: account.id,
      contactId: contact.id,
      automationId: automation.id,
      kind: "private_reply",
      recipient: { comment_id: commentId },
      payload: buildWelcomePayload(automation),
      windowExpiresAt,
    });

    if (automation.public_replies?.length) {
      const text = randomFrom(automation.public_replies as string[]);
      if (text) {
        await enqueue({
          accountId: account.id,
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

    break;
  }
}

async function handleMessaging(account: any, messaging: any) {
  const senderId: string | undefined = messaging?.sender?.id;
  const message = messaging?.message;
  if (!senderId || !message) return;

  const isStoryReply = Boolean(message?.reply_to?.story);
  const quickReplyPayload: string | undefined = message?.quick_reply?.payload;
  const text: string | undefined = message?.text;

  await logEvent(account.id, isStoryReply ? "story_reply" : "message", messaging);

  const contact = await upsertContact(account.id, senderId);

  if (quickReplyPayload) {
    await supabaseAdmin
      .from("contacts")
      .update({ last_response_at: new Date().toISOString() })
      .eq("id", contact.id);

    await scheduleFollowups(account, contact, quickReplyPayload);
    return;
  }

  if (!text) return;

  const automations = await getActiveAutomations(account.id);
  for (const automation of automations) {
    const triggerOk = isStoryReply ? automation.trigger_story_reply : automation.trigger_dm;
    if (!triggerOk) continue;
    if (!matchesKeyword(text, automation.keywords, automation.match_type)) continue;

    await enqueue({
      accountId: account.id,
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

async function scheduleFollowups(account: any, contact: any, payload: string) {
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
      accountId: account.id,
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
      accountId: account.id,
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
