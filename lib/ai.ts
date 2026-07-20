import "server-only";

type ReplyKind = "public_comment_reply" | "welcome_dm";

/**
 * Gera uma variação natural de texto (resposta pública ao comentário, ou
 * mensagem de boas-vindas na DM) usando a API da Anthropic, em vez de
 * sortear entre frases fixas escritas à mão. Se a chave não estiver
 * configurada, ou a chamada falhar/demorar, retorna null — quem chamar
 * deve ter um texto de reserva pronto (fallback), pra nunca travar o
 * envio da automação por causa disso.
 */
export async function generateAIReply(params: {
  kind: ReplyKind;
  commentText?: string;
  tone?: string;
}): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const system =
    params.kind === "public_comment_reply"
      ? 'Você escreve UMA resposta curta e natural para um comentário de Instagram, confirmando que a pessoa vai receber uma mensagem no privado. Responda só com o texto da resposta, sem aspas, sem explicações, em português do Brasil, no máximo 12 palavras.'
      : 'Você escreve UMA mensagem de boas-vindas curta e natural para abrir uma conversa por DM no Instagram, convidando a pessoa a tocar no botão logo abaixo. Responda só com o texto da mensagem, sem aspas, sem explicações, em português do Brasil, no máximo 25 palavras.';

  const userContent = [
    params.tone ? `Tom da marca: ${params.tone}` : null,
    params.commentText ? `Comentário da pessoa: "${params.commentText}"` : null,
  ]
    .filter(Boolean)
    .join("\n") || "Gere a mensagem.";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        system,
        messages: [{ role: "user", content: userContent }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    const block = data.content?.find((b: any) => b.type === "text");
    const text: string | undefined = block?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
