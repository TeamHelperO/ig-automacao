import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

export async function GET(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "account_id obrigatório" }, { status: 400 });

  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("automations")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const body = await req.json();
  if (!body.account_id) {
    return NextResponse.json({ error: "account_id obrigatório" }, { status: 400 });
  }

  const account = await ensureAccountAccess(body.account_id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("automations")
    .insert({
      account_id: body.account_id,
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
      ai_enabled: body.ai_enabled ?? false,
      ai_tone: body.ai_tone ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // passos extras da sequência (blocos adicionados no construtor visual)
  if (Array.isArray(body.steps) && body.steps.length > 0) {
    const rows = body.steps.map((step: any, index: number) => ({
      automation_id: data.id,
      step_order: index,
      delay_minutes: step.delay_minutes ?? 60,
      message_text: step.message_text ?? null,
      link_url: step.link_url ?? null,
      link_button_label: step.link_button_label ?? null,
      only_if_not_clicked: step.only_if_not_clicked ?? false,
    }));
    await supabaseAdmin.from("followups").insert(rows);
  }

  return NextResponse.json({ data });
}
