import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { data, error } = await supabaseAdmin
    .from("automations")
    .insert({
      name: body.name,
      active: body.active ?? true,
      trigger_comment: body.trigger_comment ?? true,
      trigger_story_reply: body.trigger_story_reply ?? false,
      trigger_dm: body.trigger_dm ?? false,
      keywords: body.keywords ?? [],
      match_type: body.match_type ?? "contains",
      target_media_id: body.target_media_id ?? null,
      public_replies: body.public_replies ?? [],
      welcome_dm_text: body.welcome_dm_text ?? null,
      quick_reply_label: body.quick_reply_label ?? null,
      link_text: body.link_text ?? null,
      link_button_label: body.link_button_label ?? null,
      link_url: body.link_url ?? null,
      reminder_text: body.reminder_text ?? null,
      reminder_delay_minutes: body.reminder_delay_minutes ?? 60,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
