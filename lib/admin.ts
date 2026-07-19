import "server-only";
import { getCurrentUser } from "./supabase-server-auth";

/** Retorna o usuário atual se for super admin, ou null caso contrário. */
export async function requireSuperAdmin() {
  const current = await getCurrentUser();
  if (!current || !current.profile?.is_super_admin) return null;
  return current;
}
