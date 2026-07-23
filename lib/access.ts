import "server-only";
import { supabaseAdmin } from "./supabase";

/** Início do mês corrente, em UTC. */
function startOfMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Retorna true se o trial do plano grátis do usuário já venceu.
 * Só o plano grátis tem trial (trial_days), planos pagos são controlados
 * pela assinatura em si (ativa/cancelada), não por dias corridos.
 */
export function isTrialExpired(profile: {
  plan_started_at: string;
  plans?: { price_cents: number; trial_days: number | null } | null;
}) {
  const plan = profile.plans;
  if (!plan) return false;
  if (plan.price_cents > 0) return false; // plano pago não usa trial_days
  if (!plan.trial_days) return false; // sem limite de dias configurado

  const startedAt = new Date(profile.plan_started_at);
  const expiresAt = new Date(startedAt.getTime() + plan.trial_days * 24 * 60 * 60 * 1000);
  return new Date() > expiresAt;
}

/** Quantas mensagens o usuário (somando todas as contas dele) já enviou neste mês. */
export async function countMessagesThisMonth(userId: string): Promise<number> {
  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id")
    .eq("user_id", userId);

  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return 0;

  const { count } = await supabaseAdmin
    .from("queue")
    .select("id", { count: "exact", head: true })
    .in("account_id", accountIds)
    .eq("status", "sent")
    .gte("sent_at", startOfMonth().toISOString());

  return count ?? 0;
}

/**
 * Checagem completa: essa conta pode enviar mensagens agora? Usada pelo
 * motor de fila antes de despachar qualquer envio.
 */
export async function canAccountSend(accountId: string): Promise<{ ok: boolean; reason?: string }> {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("user_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return { ok: false, reason: "conta não encontrada" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", account.user_id)
    .maybeSingle();
  if (!profile) return { ok: false, reason: "usuário não encontrado" };

  if (isTrialExpired(profile)) {
    return { ok: false, reason: "trial do plano grátis expirado" };
  }

  const maxMessages = profile.plans?.max_messages_per_month;
  if (maxMessages) {
    const used = await countMessagesThisMonth(account.user_id);
    if (used >= maxMessages) {
      return { ok: false, reason: "limite de mensagens do plano atingido neste mês" };
    }
  }

  return { ok: true };
}
