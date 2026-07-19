import "server-only";
import { supabaseAdmin } from "./supabase";
import { sendMessage, replyToComment } from "./instagram";

const MAX_PER_BATCH = 40; // ~2/s se o cron roda a cada 20s; com Hobby (1/min) isso já cobre a rajada
const SEND_INTERVAL_MS = 500; // ~2 mensagens por segundo
const HOURLY_CAP = 200; // limite prático de DMs automáticas por hora

type EnqueueInput = {
  contactId: string;
  automationId: string | null;
  kind: "private_reply" | "public_reply" | "dm" | "link" | "reminder";
  recipient: { id: string } | { comment_id: string };
  payload: Record<string, unknown>;
  sendAfter?: Date;
  windowExpiresAt?: Date | null;
};

export async function enqueue(input: EnqueueInput) {
  const recipientType = "comment_id" in input.recipient ? "comment_id" : "id";
  const recipientValue =
    "comment_id" in input.recipient ? input.recipient.comment_id : input.recipient.id;

  const { error } = await supabaseAdmin.from("queue").insert({
    contact_id: input.contactId,
    automation_id: input.automationId,
    kind: input.kind,
    recipient_type: recipientType,
    recipient_value: recipientValue,
    payload: input.payload,
    send_after: (input.sendAfter ?? new Date()).toISOString(),
    window_expires_at: input.windowExpiresAt
      ? input.windowExpiresAt.toISOString()
      : null,
  });

  if (error) throw new Error(`Falha ao enfileirar: ${error.message}`);
}

/**
 * Drena a fila: reivindica um lote de itens 'pending' de forma atômica
 * (update ... where status='pending' returning *), respeitando a janela
 * de 24h e o teto por hora, e envia com um pequeno intervalo entre cada
 * mensagem. Chamado tanto pelo pg_cron (a cada minuto) quanto de dentro
 * do webhook (via after()) para parecer instantâneo — a trava atômica
 * evita envio em dobro entre as duas chamadas.
 */
export async function drainQueue() {
  const config = await getConfig();
  if (!config?.access_token || !config.ig_user_id) {
    return { sent: 0, skipped: 0, failed: 0, note: "conta não conectada" };
  }

  const sentLastHour = await countSentLastHour();
  const budget = Math.max(0, HOURLY_CAP - sentLastHour);
  if (budget === 0) {
    return { sent: 0, skipped: 0, failed: 0, note: "teto de 200/h atingido" };
  }

  const batchSize = Math.min(MAX_PER_BATCH, budget);

  // Reivindica atomicamente: só pega itens ainda 'pending' e já muda
  // pra 'sending' na mesma operação, então duas execuções concorrentes
  // nunca pegam o mesmo item.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("queue")
    .update({ status: "sending", claimed_at: new Date().toISOString() })
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .order("send_after", { ascending: true })
    .limit(batchSize)
    .select("*");

  if (claimError) throw new Error(`Falha ao reivindicar fila: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of claimed) {
    // item expirado (fora da janela de 24h ou fora das 7 dias da
    // resposta privada) -> marca como skipped, não tenta enviar
    if (item.window_expires_at && new Date(item.window_expires_at) < new Date()) {
      await supabaseAdmin
        .from("queue")
        .update({ status: "skipped", error: "janela expirada" })
        .eq("id", item.id);
      skipped++;
      continue;
    }

    try {
      const payload = item.payload as Record<string, unknown>;

      if (item.kind === "public_reply") {
        await replyToComment({
          commentId: item.recipient_value,
          accessToken: config.access_token,
          text: (payload.text as string) ?? "",
        });
      } else {
        const recipient =
          item.recipient_type === "comment_id"
            ? { comment_id: item.recipient_value }
            : { id: item.recipient_value };

        await sendMessage({
          igUserId: config.ig_user_id,
          accessToken: config.access_token,
          recipient,
          text: payload.text as string | undefined,
          buttonUrl: payload.buttonUrl as
            | { text: string; buttonLabel: string; url: string }
            | undefined,
          quickReplies: payload.quickReplies as
            | { title: string; payload: string }[]
            | undefined,
        });
      }

      await supabaseAdmin
        .from("queue")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", item.id);
      sent++;
    } catch (err) {
      await supabaseAdmin
        .from("queue")
        .update({
          status: "failed",
          error: err instanceof Error ? err.message : String(err),
          attempts: (item.attempts ?? 0) + 1,
        })
        .eq("id", item.id);
      failed++;
    }

    await new Promise((r) => setTimeout(r, SEND_INTERVAL_MS));
  }

  return { sent, skipped, failed };
}

async function countSentLastHour() {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("sent_at", oneHourAgo);
  if (error) throw new Error(`Falha ao contar envios da última hora: ${error.message}`);
  return count ?? 0;
}

async function getConfig() {
  const { data, error } = await supabaseAdmin
    .from("config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Falha ao ler config: ${error.message}`);
  return data;
}
