import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/admin";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const update: Record<string, unknown> = {};
  if (body.plan_id !== undefined) {
    update.plan_id = body.plan_id;
    update.plan_started_at = new Date().toISOString();
  }
  if (body.is_super_admin !== undefined) update.is_super_admin = body.is_super_admin;

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
