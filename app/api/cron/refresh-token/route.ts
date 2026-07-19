import { NextRequest, NextResponse } from "next/server";
import { refreshLongLivedToken } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("id, access_token")
    .not("access_token", "is", null);

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];

  for (const account of accounts ?? []) {
    try {
      const refreshed = await refreshLongLivedToken(account.access_token);
      const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

      await supabaseAdmin
        .from("accounts")
        .update({
          access_token: refreshed.access_token,
          token_expires_at: expiresAt.toISOString(),
        })
        .eq("id", account.id);

      results.push({ id: account.id, ok: true });
    } catch (err) {
      results.push({
        id: account.id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({ ok: true, results });
}
