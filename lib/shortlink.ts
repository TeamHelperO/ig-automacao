import "server-only";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "./supabase";

function generateCode(len = 7) {
  return randomBytes(len)
    .toString("base64url")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, len);
}

/**
 * Cria um link rastreável: em vez de mandar a URL do cliente direto na
 * mensagem, mandamos {APP_URL}/l/{code}. Quando a pessoa clica, o
 * redirecionamento registra `clicked_at` antes de mandar pro destino
 * real — isso é o que permite ver a conversão completa (comentou →
 * recebeu DM → clicou) na tela de Atividade.
 */
export async function createTrackedLink(params: {
  accountId: string;
  automationId: string | null;
  contactId: string;
  destinationUrl: string;
}): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode();
    const { error } = await supabaseAdmin.from("link_clicks").insert({
      account_id: params.accountId,
      automation_id: params.automationId,
      contact_id: params.contactId,
      code,
      destination_url: params.destinationUrl,
    });
    if (!error) return code;
    if (error.code !== "23505") throw new Error(`Falha ao criar link: ${error.message}`);
    // colidiu no código único, tenta de novo com outro
  }
  throw new Error("Falha ao gerar link rastreável após várias tentativas");
}

export function trackedLinkUrl(code: string) {
  return `${process.env.APP_URL}/l/${code}`;
}
