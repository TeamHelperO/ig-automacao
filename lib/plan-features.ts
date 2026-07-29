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
