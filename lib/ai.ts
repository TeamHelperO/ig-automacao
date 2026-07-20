import "server-only";

type ReplyKind = "public_comment_reply" | "welcome_dm";

/**
 * Gera uma variação natural de texto (resposta pública ao comentário, ou
 * mensagem de boas-vindas na DM) usando a API da OpenAI (GPT), em vez de
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

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

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 100,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) return null;

    const data = await res.json();
    const text: string | undefined = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}
