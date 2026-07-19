import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAutomationOwnership } from "@/lib/ownership";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const owned = await ensureAutomationOwnership(id, current.authUser.id);
  if (!owned) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("followups")
    .select("*")
    .eq("automation_id", id)
    .order("step_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const owned = await ensureAutomationOwnership(id, current.authUser.id);
  if (!owned) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const body = await req.json();

  const { count } = await supabaseAdmin
    .from("followups")
    .select("id", { count: "exact", head: true })
    .eq("automation_id", id);

  const { data, error } = await supabaseAdmin
    .from("followups")
    .insert({
      automation_id: id,
      step_order: count ?? 0,
      delay_minutes: body.delay_minutes ?? 60,
      message_text: body.message_text ?? null,
      link_url: body.link_url ?? null,
      link_button_label: body.link_button_label ?? null,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
