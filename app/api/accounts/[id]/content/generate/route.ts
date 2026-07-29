import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { listMedia } from "@/lib/instagram";
import { generateImage } from "@/lib/image-gen";
import { checkAccountFeature } from "@/lib/plan-features";

async function generateCaption(idea: string, styleNotes: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return idea;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: "system",
            content: `Você escreve legendas de post de Instagram em português do Brasil, curtas e naturais, com 1-3 hashtags relevantes no final quando fizer sentido. ${styleNotes}`,
          },
          { role: "user", content: `Ideia do post: ${idea}` },
        ],
      }),
    });
    if (!res.ok) return idea;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || idea;
  } catch {
    return idea;
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { idea, format, count } = await req.json();
  if (!idea?.trim() || !["feed", "carousel"].includes(format)) {
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  }

  const feature = await checkAccountFeature(accountId, "content_publish");
  if (!feature.enabled) {
    return NextResponse.json(
      { error: "Postagem automática com IA não está incluída no seu plano — faça upgrade." },
      { status: 403 }
    );
  }
  if (feature.limit !== null) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { count: usedCount } = await supabaseAdmin
      .from("content_posts")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .in("status", ["ready", "scheduled", "publishing", "published"])
      .gte("created_at", startOfMonth.toISOString());
    if ((usedCount ?? 0) >= feature.limit) {
      return NextResponse.json(
        { error: `Seu plano permite até ${feature.limit} post(s) por mês. Você já usou esse limite.` },
        { status: 403 }
      );
    }
  }

  const imageCount = format === "carousel" ? Math.min(Math.max(Number(count) || 3, 2), 10) : 1;

  // analisa os posts existentes pra puxar um "estilo" (só as legendas, sem
  // baixar/analisar as imagens em si — mantém simples e rápido)
  let styleNotes = "";
  try {
    if (account.access_token && account.ig_user_id) {
      const media = await listMedia({
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        limit: 8,
      });
      const captions = (media.data ?? [])
        .map((m) => m.caption)
        .filter(Boolean)
        .slice(0, 6);
      if (captions.length) {
        styleNotes = `Legendas recentes desse perfil, pra você captar o tom de voz: ${captions.join(
          " | "
        )}`;
      }
    }
  } catch {
    // segue sem estilo se falhar
  }

  const postRow = await supabaseAdmin
    .from("content_posts")
    .insert({ account_id: accountId, format, idea, status: "generating" })
    .select("*")
    .single();

  if (postRow.error) {
    return NextResponse.json({ error: postRow.error.message }, { status: 500 });
  }
  const postId = postRow.data.id;

  try {
    const imagePrompt = `${idea}. Estilo de post de Instagram profissional, visual limpo e atraente, alta qualidade, sem texto sobreposto.`;
    const imageUrls: string[] = [];

    for (let i = 0; i < imageCount; i++) {
      const buffer = await generateImage(imagePrompt);
      if (!buffer) throw new Error("Falha ao gerar imagem (verifique a chave/crédito da OpenAI)");

      const path = `${accountId}/${postId}-${i}.png`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from("content")
        .upload(path, buffer, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrl } = supabaseAdmin.storage.from("content").getPublicUrl(path);
      imageUrls.push(publicUrl.publicUrl);
    }

    const caption = await generateCaption(idea, styleNotes);

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("content_posts")
      .update({ status: "ready", image_urls: imageUrls, caption, updated_at: new Date().toISOString() })
      .eq("id", postId)
      .select("*")
      .single();

    if (updateError) throw new Error(updateError.message);
    return NextResponse.json({ data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from("content_posts")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", postId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
