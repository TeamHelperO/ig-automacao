import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { verifyMetaSignature } from "@/lib/verify-signature";
import { supabaseAdmin } from "@/lib/supabase";
import { enqueue, drainQueue } from "@/lib/queue";
import { createTrackedLink, trackedLinkUrl } from "@/lib/shortlink";
import { generateAIReply, generateAgentReply } from "@/lib/ai";
import { tryGetPersonName } from "@/lib/instagram";
import { checkTokenBudget, logTokenUsage } from "@/lib/plan-features";

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
      if (messaging.read) {
        await handleReadReceipt(account, messaging);
      } else if (messaging.reaction) {
        await handleReaction(account, messaging);
      } else {
        await handleMessaging(account, messaging);
      }
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

async function upsertContact(account: any, igScopedId: string, username?: string) {
  const { data: existing } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("account_id", account.id)
    .eq("ig_scoped_id", igScopedId)
    .maybeSingle();

  if (existing) return existing;

  // sem @ (veio de DM direta, não de comentário) — tenta pegar ao menos
  // o nome de exibição, pra não mostrar só um número no painel
  let displayName: string | null = null;
  if (!username && account.access_token && account.ig_user_id) {
    displayName = await tryGetPersonName({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
      personIgsid: igScopedId,
    });
  }

  const { data: created, error } = await supabaseAdmin
    .from("contacts")
    .insert({ account_id: account.id, ig_scoped_id: igScopedId, username, display_name: displayName })
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
  // quando o comentário vem da versão impulsionada (anúncio) do post, a
  // Meta manda um media.id diferente do post orgânico — o post "de
  // verdade" vem em media.original_media_id nesse caso. Checamos os dois.
  const mediaId: string | undefined = value?.media?.id;
  const originalMediaId: string | undefined = value?.media?.original_media_id;
  const fromId: string | undefined = value?.from?.id;
  const fromUsername: string | undefined = value?.from?.username;

  if (!commentId || !commentText || !fromId) return;

  const automations = await getActiveAutomations(account.id);

  for (const automation of automations) {
    if (!automation.trigger_comment) continue;
    if (
      automation.target_media_id &&
      automation.target_media_id !== mediaId &&
      automation.target_media_id !== originalMediaId
    )
      continue;
    if (!matchesKeyword(commentText, automation.keywords, automation.match_type)) continue;

    const contact = await upsertContact(account, fromId, fromUsername);
    const windowExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await enqueue({
      accountId: account.id,
      contactId: contact.id,
      automationId: automation.id,
      kind: "private_reply",
      recipient: { comment_id: commentId },
      payload: await buildWelcomePayload(automation, account.id),
      windowExpiresAt,
    });

    if (automation.public_replies?.length || automation.public_reply_ai_enabled) {
      let text: string | null = null;

      if (automation.public_reply_ai_enabled) {
        const budget = await checkTokenBudget(account.id, "ai_replies");
        if (budget.ok) {
          const result = await generateAIReply({
            kind: "public_comment_reply",
            commentText,
            tone: automation.ai_tone ?? undefined,
          });
          if (result) {
            text = result.text;
            await logTokenUsage(account.id, "ai_replies", result.tokens);
          }
        }
      }

      if (!text) text = randomFrom(automation.public_replies as string[]) ?? null;

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

  // eco: a Meta confirma de volta uma mensagem que A GENTE mandou —
  // o "remetente" desse eco vem com o ID da própria conta comercial,
  // não de um contato de verdade. Ignora, senão vira contato fantasma.
  if (senderId === account.ig_user_id || message?.is_echo) return;

  const isStoryReply = Boolean(message?.reply_to?.story);
  const quickReplyPayload: string | undefined = message?.quick_reply?.payload;
  const text: string | undefined = message?.text;
  const mid: string | undefined = message?.mid;
  // origem da conversa (anúncio, link na bio, etc.) — vem só na 1ª mensagem
  const referral = messaging?.referral ?? message?.referral;

  await logEvent(account.id, isStoryReply ? "story_reply" : "message", messaging);

  const contact = await upsertContact(account, senderId);

  const contactUpdate: Record<string, unknown> = {
    last_response_at: new Date().toISOString(),
  };
  if (referral && !contact.referral) {
    contactUpdate.referral = referral;
  }

  // qualquer mensagem da pessoa (não só o toque no botão) abre/renova a
  // janela de 24h de verdade, e entra no histórico da caixa de entrada
  await supabaseAdmin.from("contacts").update(contactUpdate).eq("id", contact.id);

  if (text) {
    await supabaseAdmin.from("messages").insert({
      account_id: account.id,
      contact_id: contact.id,
      direction: "inbound",
      text,
      source: "user",
      ig_message_id: mid ?? null,
    });
  }

  if (quickReplyPayload) {
    await scheduleFollowups(account, contact, quickReplyPayload);
    return;
  }

  if (!text) return;

  const automations = await getActiveAutomations(account.id);
  let matched = false;
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
      payload: await buildWelcomePayload(automation, account.id),
    });

    await supabaseAdmin
      .from("contacts")
      .update({ last_automation_id: automation.id })
      .eq("id", contact.id);

    matched = true;
    break;
  }

  // ninguém das automações bateu com essa mensagem -> se tiver um agente
  // de IA ligado nessa conta, ele assume a conversa (nunca os dois juntos)
  if (!matched) {
    await maybeReplyWithAgent(account, contact, text);
  }
}

// A pessoa leu nossas mensagens até um certo ponto no tempo (watermark).
// Marca como "visto" todas as mensagens que mandamos pra ela antes disso.
async function handleReadReceipt(account: any, messaging: any) {
  const senderId: string | undefined = messaging?.sender?.id;
  const watermark: number | undefined = messaging?.read?.watermark ?? messaging?.read?.mid;
  if (!senderId || senderId === account.ig_user_id) return;

  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("id")
    .eq("account_id", account.id)
    .eq("ig_scoped_id", senderId)
    .maybeSingle();
  if (!contact) return;

  const cutoff = typeof watermark === "number" ? new Date(watermark).toISOString() : new Date().toISOString();

  await supabaseAdmin
    .from("messages")
    .update({ seen_at: new Date().toISOString() })
    .eq("account_id", account.id)
    .eq("contact_id", contact.id)
    .eq("direction", "outbound")
    .is("seen_at", null)
    .lte("created_at", cutoff);
}

// A pessoa reagiu (emoji) a uma mensagem nossa específica.
async function handleReaction(account: any, messaging: any) {
  const senderId: string | undefined = messaging?.sender?.id;
  const mid: string | undefined = messaging?.reaction?.mid;
  const emoji: string | undefined = messaging?.reaction?.reaction;
  const action: string | undefined = messaging?.reaction?.action; // "react" | "unreact"
  if (!senderId || senderId === account.ig_user_id || !mid) return;

  const { data: message } = await supabaseAdmin
    .from("messages")
    .select("id, reactions")
    .eq("account_id", account.id)
    .eq("ig_message_id", mid)
    .maybeSingle();
  if (!message) return;

  const current: any[] = Array.isArray(message.reactions) ? message.reactions : [];
  const next =
    action === "unreact"
      ? current.filter((r) => r.emoji !== emoji)
      : [...current.filter((r) => r.emoji !== emoji), { emoji, at: new Date().toISOString() }];

  await supabaseAdmin.from("messages").update({ reactions: next }).eq("id", message.id);
}

async function maybeReplyWithAgent(account: any, contact: any, incomingText: string) {
  // um humano já assumiu essa conversa manualmente — a IA não entra até
  // alguém reativar (evita a IA e a pessoa da equipe responderem junto)
  if (contact.ai_paused) return;

  const { data: agent } = await supabaseAdmin
    .from("ai_agents")
    .select("*")
    .eq("account_id", account.id)
    .eq("enabled", true)
    .maybeSingle();

  if (!agent?.system_prompt) return;

  const budget = await checkTokenBudget(account.id, "ai_agent");
  if (!budget.ok) return; // sem orçamento — melhor não responder do que travar/estourar o plano

  const { data: history } = await supabaseAdmin
    .from("messages")
    .select("direction, text")
    .eq("account_id", account.id)
    .eq("contact_id", contact.id)
    .order("created_at", { ascending: true })
    .limit(20);

  const result = await generateAgentReply({
    accountId: account.id,
    systemPrompt: agent.system_prompt,
    history: (history ?? []).map((m: any) => ({ direction: m.direction, text: m.text ?? "" })),
    incomingText,
    maxChars: agent.max_response_chars ?? 300,
    temperature: agent.temperature ?? 0.7,
  });

  if (!result) return;
  await logTokenUsage(account.id, "ai_agent", result.tokens);

  await enqueue({
    accountId: account.id,
    contactId: contact.id,
    automationId: null,
    kind: "dm",
    recipient: { id: contact.ig_scoped_id },
    payload: { text: result.text, simulateTyping: agent.simulate_typing ?? true },
  });
}

async function buildWelcomePayload(automation: any, accountId: string) {
  const quickReplies = automation.quick_reply_label
    ? [{ title: automation.quick_reply_label, payload: `automation:${automation.id}` }]
    : undefined;

  let text: string | null = null;

  if (automation.dm_ai_enabled) {
    const budget = await checkTokenBudget(accountId, "ai_replies");
    if (budget.ok) {
      const result = await generateAIReply({ kind: "welcome_dm", tone: automation.ai_tone ?? undefined });
      if (result) {
        text = result.text;
        await logTokenUsage(accountId, "ai_replies", result.tokens);
      }
    }
  }

  if (!text) text = automation.welcome_dm_text || "Oi! Toque no botão abaixo pra continuar 👇";

  return { text, quickReplies };
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
    const code = await createTrackedLink({
      accountId: account.id,
      automationId: automation.id,
      contactId: contact.id,
      destinationUrl: automation.link_url,
    });

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
          url: trackedLinkUrl(code),
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

  // sequência de passos extras, configurada em /sequencia (além do
  // link + lembrete simples acima, que continuam funcionando sozinhos)
  const { data: steps } = await supabaseAdmin
    .from("followups")
    .select("*")
    .eq("automation_id", automation.id)
    .order("step_order", { ascending: true });

  for (const step of steps ?? []) {
    const delayMs = (step.delay_minutes ?? 0) * 60 * 1000;
    let buttonUrl: { text: string; buttonLabel: string; url: string } | undefined;

    if (step.link_url) {
      const code = await createTrackedLink({
        accountId: account.id,
        automationId: automation.id,
        contactId: contact.id,
        destinationUrl: step.link_url,
      });
      buttonUrl = {
        text: step.message_text ?? "Aqui está 👇",
        buttonLabel: step.link_button_label ?? "Acessar",
        url: trackedLinkUrl(code),
      };
    }

    const payload: Record<string, unknown> = buttonUrl ? { buttonUrl } : { text: step.message_text ?? "" };
    if (step.only_if_not_clicked) payload.only_if_not_clicked = true;

    await enqueue({
      accountId: account.id,
      contactId: contact.id,
      automationId: automation.id,
      kind: "reminder",
      recipient: { id: contact.ig_scoped_id },
      payload,
      sendAfter: new Date(Date.now() + delayMs),
      windowExpiresAt: new Date(Date.now() + delayMs + 24 * 60 * 60 * 1000),
    });
  }
}
