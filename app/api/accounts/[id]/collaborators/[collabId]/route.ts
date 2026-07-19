import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountOwnership } from "@/lib/ownership";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; collabId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id, collabId } = await params;
  const account = await ensureAccountOwnership(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("account_collaborators")
    .delete()
    .eq("id", collabId)
    .eq("account_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
