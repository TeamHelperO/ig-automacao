import "server-only";

/**
 * Gera uma imagem via API de imagens da OpenAI, a partir de um prompt.
 * Retorna o buffer da imagem (PNG) ou null se falhar/não configurado.
 */
export async function generateImage(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
        n: 1,
      }),
    });

    if (!res.ok) {
      console.error("Erro ao gerar imagem:", await res.text());
      return null;
    }

    const data = await res.json();
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (err) {
    console.error("Erro ao gerar imagem:", err);
    return null;
  }
}
