import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const { data: link } = await supabaseAdmin
    .from("link_clicks")
    .select("*")
    .eq("code", code)
    .maybeSingle();

  if (!link) return new NextResponse("Link não encontrado", { status: 404 });

  if (!link.clicked_at) {
    await supabaseAdmin
      .from("link_clicks")
      .update({ clicked_at: new Date().toISOString() })
      .eq("id", link.id);
  }

  return NextResponse.redirect(link.destination_url, { status: 307 });
}
