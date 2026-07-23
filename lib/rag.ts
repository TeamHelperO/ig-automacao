import "server-only";
import { supabaseAdmin } from "./supabase";
import { embedText } from "./embeddings";

/** Corta um texto grande em pedaços menores (~800 caracteres), sem cortar frases no meio. */
function chunkText(text: string, maxLen = 800): string[] {
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxLen && current) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? `${current}\n\n${p}` : p;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks.length ? chunks : [text.trim()];
}

export async function addKnowledge(accountId: string, title: string, content: string) {
  const pieces = chunkText(content);
  const rows = [];

  for (const piece of pieces) {
    const embedding = await embedText(piece);
    rows.push({
      account_id: accountId,
      title,
      content: piece,
      embedding,
    });
  }

  const { error } = await supabaseAdmin.from("knowledge_chunks").insert(rows);
  if (error) throw new Error(`Falha ao salvar conhecimento: ${error.message}`);
  return rows.length;
}

export async function searchKnowledge(accountId: string, query: string, matchCount = 5) {
  const embedding = await embedText(query);
  if (!embedding) return [];

  const { data, error } = await supabaseAdmin.rpc("match_knowledge_chunks", {
    p_account_id: accountId,
    p_query_embedding: embedding,
    p_match_count: matchCount,
  });

  if (error) {
    console.error("Erro na busca de conhecimento:", error);
    return [];
  }
  return data ?? [];
}
