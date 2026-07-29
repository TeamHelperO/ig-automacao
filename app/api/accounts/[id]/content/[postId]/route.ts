import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

// PATCH { scheduled_at } -> agenda a postagem pra um horário futuro
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId, postId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { scheduled_at } = await req.json();
  if (!scheduled_at) return NextResponse.json({ error: "scheduled_at obrigatório" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("content_posts")
    .update({ status: "scheduled", scheduled_at, updated_at: new Date().toISOString() })
    .eq("id", postId)
    .eq("account_id", accountId)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId, postId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("content_posts")
    .delete()
    .eq("id", postId)
    .eq("account_id", accountId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
