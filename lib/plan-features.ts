import "server-only";
import { supabaseAdmin } from "./supabase";
import type { FeatureKey } from "./features";

/** Retorna {enabled, limit} da funcionalidade pro plano de uma conta. limit=null é ilimitado. */
export async function checkAccountFeature(
  accountId: string,
  key: FeatureKey
): Promise<{ enabled: boolean; limit: number | null; reason?: string }> {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("user_id")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return { enabled: false, limit: null, reason: "conta não encontrada" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan_id")
    .eq("id", account.user_id)
    .maybeSingle();
  if (!profile?.plan_id) return { enabled: false, limit: null, reason: "sem plano" };

  const { data: feature } = await supabaseAdmin
    .from("plan_features")
    .select("*")
    .eq("plan_id", profile.plan_id)
    .eq("feature_key", key)
    .maybeSingle();

  if (!feature || !feature.enabled) {
    return { enabled: false, limit: null, reason: "não incluído no seu plano — faça upgrade" };
  }

  return { enabled: true, limit: feature.limit_value };
}

function startOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getTokenUsageThisMonth(
  accountId: string,
  featureKey: "ai_agent" | "ai_replies"
): Promise<number> {
  const { data } = await supabaseAdmin
    .from("ai_token_usage")
    .select("tokens")
    .eq("account_id", accountId)
    .eq("feature_key", featureKey)
    .gte("created_at", startOfMonth().toISOString());
  return (data ?? []).reduce((sum, r) => sum + (r.tokens ?? 0), 0);
}

/** Checa se ainda há orçamento de tokens de IA disponível pra essa conta neste mês. */
export async function checkTokenBudget(
  accountId: string,
  featureKey: "ai_agent" | "ai_replies"
): Promise<{ ok: boolean; reason?: string }> {
  const feature = await checkAccountFeature(accountId, featureKey);
  if (!feature.enabled) return { ok: false, reason: feature.reason };
  if (feature.limit === null) return { ok: true };

  const used = await getTokenUsageThisMonth(accountId, featureKey);
  if (used >= feature.limit) {
    return { ok: false, reason: "limite de tokens de IA do plano atingido neste mês" };
  }
  return { ok: true };
}

/** Registra o consumo de tokens de uma chamada de IA (pra contabilizar no mês). */
export async function logTokenUsage(
  accountId: string,
  featureKey: "ai_agent" | "ai_replies",
  tokens: number
) {
  if (!tokens) return;
  await supabaseAdmin.from("ai_token_usage").insert({
    account_id: accountId,
    feature_key: featureKey,
    tokens,
  });
}

/** Checa se ainda há "consultas" de insights disponíveis nesse mês. */
export async function checkInsightsQuota(accountId: string): Promise<{ ok: boolean; reason?: string }> {
  const feature = await checkAccountFeature(accountId, "insights");
  if (!feature.enabled) return { ok: false, reason: feature.reason };
  if (feature.limit === null) return { ok: true };

  const { count } = await supabaseAdmin
    .from("insights_usage")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .gte("created_at", startOfMonth().toISOString());

  if ((count ?? 0) >= feature.limit) {
    return { ok: false, reason: "limite de consultas de insights do plano atingido neste mês" };
  }
  return { ok: true };
}

export async function logInsightsUsage(accountId: string) {
  await supabaseAdmin.from("insights_usage").insert({ account_id: accountId });
}
