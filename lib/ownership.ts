import "server-only";
import { supabaseAdmin } from "./supabase";

/** Retorna a conta se o usuário for o DONO dela (usado pra ações sensíveis: desconectar, convidar equipe). */
export async function ensureAccountOwnership(accountId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Retorna a conta se o usuário for o dono OU um colaborador dela (usado pro dia a dia: automações, contatos, etc). */
export async function ensureAccountAccess(accountId: string, userId: string) {
  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .maybeSingle();

  if (!account) return null;
  if (account.user_id === userId) return account;

  const { data: collab } = await supabaseAdmin
    .from("account_collaborators")
    .select("id")
    .eq("account_id", accountId)
    .eq("user_id", userId)
    .maybeSingle();

  return collab ? account : null;
}

/** Retorna a automação + a conta dona dela, só se o usuário tiver acesso (dono ou colaborador). */
export async function ensureAutomationOwnership(automationId: string, userId: string) {
  const { data: automation } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .maybeSingle();

  if (!automation) return null;

  const account = await ensureAccountAccess(automation.account_id, userId);
  if (!account) return null;

  return { automation, account };
}
