import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { getAccountInsights, getMediaInsights, listMedia } from "@/lib/instagram";
import { checkAccountFeature } from "@/lib/plan-features";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account?.access_token || !account.ig_user_id) {
    return NextResponse.json({ error: "conta não conectada" }, { status: 404 });
  }

  const feature = await checkAccountFeature(accountId, "insights");
  if (!feature.enabled) {
    return NextResponse.json(
      { error: "Insights não está incluído no seu plano — faça upgrade." },
      { status: 403 }
    );
  }

  const result: { account: any; posts: any[]; error?: string } = { account: null, posts: [] };

  try {
    result.account = await getAccountInsights({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
    });
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
  }

  try {
    const media = await listMedia({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
      limit: 12,
    });

    for (const item of media.data ?? []) {
      try {
        const insights = await getMediaInsights({
          mediaId: item.id,
          accessToken: account.access_token,
        });
        result.posts.push({ media: item, insights: insights.data ?? [] });
      } catch {
        // pula o post se não conseguir buscar insights dele especificamente
      }
    }
  } catch (err) {
    if (!result.error) result.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(result);
}
