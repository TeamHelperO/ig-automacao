import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { addKnowledge } from "@/lib/rag";
import { extractTextFromFile } from "@/lib/file-extract";

export const maxDuration = 60;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "nenhum arquivo enviado" }, { status: 400 });

  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "arquivo maior que 15MB" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractTextFromFile({ filename: file.name, buffer });

    if (!text.trim()) {
      return NextResponse.json(
        { error: "não consegui extrair texto desse arquivo (pode estar escaneado como imagem, sem texto real)" },
        { status: 400 }
      );
    }

    const count = await addKnowledge(id, file.name, text);
    return NextResponse.json({ ok: true, chunks: count });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
