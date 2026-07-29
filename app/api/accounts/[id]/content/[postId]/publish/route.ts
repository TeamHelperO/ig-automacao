import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { publishContentPost } from "@/lib/content-publish";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; postId: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId, postId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  try {
    await publishContentPost(postId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
