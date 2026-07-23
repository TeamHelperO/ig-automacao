import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; chunkId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id, chunkId } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("knowledge_chunks")
    .delete()
    .eq("id", chunkId)
    .eq("account_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
