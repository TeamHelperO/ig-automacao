import { NextRequest, NextResponse } from "next/server";
import { refreshLongLivedToken } from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { data: config } = await supabaseAdmin
      .from("config")
      .select("access_token")
      .eq("id", 1)
      .maybeSingle();

    if (!config?.access_token) {
      return NextResponse.json({ ok: false, note: "conta não conectada" });
    }

    const refreshed = await refreshLongLivedToken(config.access_token);
    const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

    await supabaseAdmin
      .from("config")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: expiresAt.toISOString(),
      })
      .eq("id", 1);

    return NextResponse.json({ ok: true, expires_at: expiresAt.toISOString() });
  } catch (err) {
    console.error("Erro ao renovar token:", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
