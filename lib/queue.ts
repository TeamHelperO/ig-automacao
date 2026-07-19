import "server-only";
import { supabaseAdmin } from "./supabase";
import { sendMessage, replyToComment } from "./instagram";

const MAX_PER_BATCH = 60;
const SEND_INTERVAL_MS = 500; // ~2 mensagens por segundo
const HOURLY_CAP_PER_ACCOUNT = 200;

type EnqueueInput = {
  accountId: string;
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
    account_id: input.accountId,
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
 * Drena a fila de TODAS as contas conectadas de uma vez, respeitando
 * o token e o teto de 200/h de CADA conta separadamente. Chamado
 * pelo pg_cron (a cada minuto) e de dentro do webhook (via after()).
 */
export async function drainQueue() {
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("queue")
    .update({ status: "sending", claimed_at: new Date().toISOString() })
    .eq("status", "pending")
    .lte("send_after", new Date().toISOString())
    .order("send_after", { ascending: true })
    .limit(MAX_PER_BATCH)
    .select("*");

  if (claimError) throw new Error(`Falha ao reivindicar fila: ${claimError.message}`);
  if (!claimed || claimed.length === 0) return { sent: 0, skipped: 0, failed: 0 };

  const accountIds = [...new Set(claimed.map((i) => i.account_id).filter(Boolean))];
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .in("id", accountIds);

  const accountById = new Map((accounts ?? []).map((a) => [a.id, a]));
  const budgetByAccount = new Map<string, number>();
  for (const accountId of accountIds) {
    const sentLastHour = await countSentLastHour(accountId);
    budgetByAccount.set(accountId, Math.max(0, HOURLY_CAP_PER_ACCOUNT - sentLastHour));
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of claimed) {
    const account = item.account_id ? accountById.get(item.account_id) : null;

    if (!account?.access_token || !account.ig_user_id) {
      await supabaseAdmin
        .from("queue")
        .update({ status: "failed", error: "conta não conectada" })
        .eq("id", item.id);
      failed++;
      continue;
    }

    const remaining = budgetByAccount.get(item.account_id) ?? 0;
    if (remaining <= 0) {
      // deixa 'pending' de novo pra tentar na próxima drenagem
      await supabaseAdmin
        .from("queue")
        .update({ status: "pending" })
        .eq("id", item.id);
      skipped++;
      continue;
    }

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
          accessToken: account.access_token,
          text: (payload.text as string) ?? "",
        });
      } else {
        const recipient =
          item.recipient_type === "comment_id"
            ? { comment_id: item.recipient_value }
            : { id: item.recipient_value };

        await sendMessage({
          igUserId: account.ig_user_id,
          accessToken: account.access_token,
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
      budgetByAccount.set(item.account_id, remaining - 1);
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

async function countSentLastHour(accountId: string) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabaseAdmin
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("status", "sent")
    .gte("sent_at", oneHourAgo);
  if (error) throw new Error(`Falha ao contar envios da última hora: ${error.message}`);
  return count ?? 0;
}
