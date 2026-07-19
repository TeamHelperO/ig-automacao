import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { listMedia } from "@/lib/instagram";

export async function GET() {
  const { data: config } = await supabaseAdmin
    .from("config")
    .select("ig_user_id, access_token")
    .eq("id", 1)
    .maybeSingle();

  if (!config?.access_token || !config.ig_user_id) {
    return NextResponse.json({ error: "conta não conectada" }, { status: 400 });
  }

  try {
    const result = await listMedia({
      igUserId: config.ig_user_id,
      accessToken: config.access_token,
      limit: 30,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
