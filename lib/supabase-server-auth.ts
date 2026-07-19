import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "./supabase";

/**
 * Cliente Supabase que lê a sessão de autenticação a partir dos
 * cookies da requisição. Usa a chave anônima (não a service role):
 * serve só pra descobrir QUEM está logado, nunca pra ler/escrever
 * dados — isso continua sendo feito com supabaseAdmin, sempre
 * filtrando manualmente por user_id/account_id no código.
 */
export async function supabaseServerAuth() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component; ok ignorar,
            // o middleware/proxy já cuida de refrescar a sessão.
          }
        },
      },
    }
  );
}

/** Retorna o usuário logado (com profile: plano, super admin) ou null. */
export async function getCurrentUser() {
  const supabase = await supabaseServerAuth();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user.id)
    .maybeSingle();

  return { authUser: user, profile };
}
