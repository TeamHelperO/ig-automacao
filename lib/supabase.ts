import "server-only";
import { createClient } from "@supabase/supabase-js";

// Este cliente usa a SERVICE ROLE KEY e só pode ser importado em código
// que roda no servidor (route handlers, server actions). O pacote
// "server-only" garante isso: se algum arquivo de cliente importar isto,
// o build quebra de propósito.
//
// Todas as tabelas têm RLS ligado e SEM políticas — ou seja, só a service
// role (que ignora RLS) consegue ler/escrever. O navegador nunca recebe
// essa chave.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nas variáveis de ambiente."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});
