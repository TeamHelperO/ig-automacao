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

  return NextResponse.json({ data: owned.automation });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const owned = await ensureAutomationOwnership(id, current.authUser.id);
  if (!owned) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const body = await req.json();
  delete body.account_id; // não deixa trocar o dono da automação por aqui

  const { data, error } = await supabaseAdmin
    .from("automations")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const owned = await ensureAutomationOwnership(id, current.authUser.id);
  if (!owned) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const { error } = await supabaseAdmin.from("automations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
