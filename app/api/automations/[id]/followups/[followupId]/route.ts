import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAutomationOwnership } from "@/lib/ownership";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; followupId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id, followupId } = await params;
  const owned = await ensureAutomationOwnership(id, current.authUser.id);
  if (!owned) return NextResponse.json({ error: "não encontrada" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("followups")
    .delete()
    .eq("id", followupId)
    .eq("automation_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
