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

  const { data, error } = await supabaseAdmin
    .from("plans")
    .update(body)
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
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { id } = await params;

  const { count } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("plan_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: `${count} usuário(s) ainda estão nesse plano. Mude o plano deles antes de excluir.` },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin.from("plans").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
