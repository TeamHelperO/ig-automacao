import "server-only";
import { searchKnowledge } from "./rag";

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

/**
 * Gera a resposta do agente de atendimento (RAG): busca os trechos mais
 * relevantes da base de conhecimento daquela conta, monta o histórico
 * recente da conversa, e chama o modelo com o prompt que o próprio dono
 * da conta escreveu. Se não configurado ou a chamada falhar, retorna
 * null — quem chamar decide o que fazer (não manda nada, por segurança:
 * melhor não responder do que responder errado).
 */
export async function generateAgentReply(params: {
  accountId: string;
  systemPrompt: string;
  history: { direction: "inbound" | "outbound"; text: string }[];
  incomingText: string;
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const chunks = await searchKnowledge(params.accountId, params.incomingText, 5);
  const context = chunks.length
    ? chunks.map((c: any) => c.content).join("\n\n---\n\n")
    : "(nenhuma informação relevante encontrada na base de conhecimento)";

  const system = `${params.systemPrompt}

Use as informações abaixo, extraídas da base de conhecimento do negócio, para responder com precisão. Se a resposta não estiver nas informações, seja honesto e não invente dados (preços, prazos, políticas). Responda em português do Brasil, de forma natural e breve, como numa conversa de DM do Instagram — nunca use markdown.

--- BASE DE CONHECIMENTO ---
${context}
--- FIM DA BASE DE CONHECIMENTO ---`;

  const messages = [
    { role: "system", content: system },
    ...params.history.slice(-10).map((m) => ({
      role: m.direction === "inbound" ? "user" : "assistant",
      content: m.text,
    })),
    { role: "user", content: params.incomingText },
  ];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, max_tokens: 300, messages }),
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
