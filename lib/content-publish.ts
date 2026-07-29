import "server-only";
import { supabaseAdmin } from "./supabase";
import { createImageContainer, createCarouselContainer, publishContainer } from "./instagram";

export async function publishContentPost(postId: string) {
  const { data: post } = await supabaseAdmin
    .from("content_posts")
    .select("*, accounts(*)")
    .eq("id", postId)
    .maybeSingle();

  if (!post) throw new Error("post não encontrado");
  const account = (post as any).accounts;
  if (!account?.access_token || !account.ig_user_id) {
    throw new Error("conta não conectada");
  }

  await supabaseAdmin
    .from("content_posts")
    .update({ status: "publishing", updated_at: new Date().toISOString() })
    .eq("id", postId);

  try {
    let creationId: string;

    if (post.format === "carousel") {
      const childIds: string[] = [];
      for (const imageUrl of post.image_urls) {
        const child = await createImageContainer({
          igUserId: account.ig_user_id,
          accessToken: account.access_token,
          imageUrl,
          isCarouselItem: true,
        });
        childIds.push(child.id);
      }
      const parent = await createCarouselContainer({
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        childrenIds: childIds,
        caption: post.caption ?? undefined,
      });
      creationId = parent.id;
    } else {
      const container = await createImageContainer({
        igUserId: account.ig_user_id,
        accessToken: account.access_token,
        imageUrl: post.image_urls[0],
        caption: post.caption ?? undefined,
      });
      creationId = container.id;
    }

    const published = await publishContainer({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
      creationId,
    });

    await supabaseAdmin
      .from("content_posts")
      .update({
        status: "published",
        ig_media_id: published.id,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await supabaseAdmin
      .from("content_posts")
      .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
      .eq("id", postId);
    throw err;
  }
}
