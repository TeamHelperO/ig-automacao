import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { publishContentPost } from "@/lib/content-publish";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: due } = await supabaseAdmin
    .from("content_posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const post of due ?? []) {
    try {
      await publishContentPost(post.id);
      results.push({ id: post.id, ok: true });
    } catch (err) {
      results.push({ id: post.id, ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ ok: true, results });
}
