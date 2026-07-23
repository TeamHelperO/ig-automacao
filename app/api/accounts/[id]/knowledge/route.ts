import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { addKnowledge } from "@/lib/rag";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("knowledge_chunks")
    .select("id, title, content, created_at")
    .eq("account_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { title, content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: "conteúdo obrigatório" }, { status: 400 });

  try {
    const count = await addKnowledge(id, title ?? "", content);
    return NextResponse.json({ ok: true, chunks: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
