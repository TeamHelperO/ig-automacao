import "server-only";
import { supabaseAdmin } from "./supabase";

/** Retorna a conta se pertencer ao usuário, ou null caso contrário. */
export async function ensureAccountOwnership(accountId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Retorna a automação + a conta dona dela, só se pertencer ao usuário. */
export async function ensureAutomationOwnership(automationId: string, userId: string) {
  const { data: automation } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .maybeSingle();

  if (!automation) return null;

  const account = await ensureAccountOwnership(automation.account_id, userId);
  if (!account) return null;

  return { automation, account };
}
