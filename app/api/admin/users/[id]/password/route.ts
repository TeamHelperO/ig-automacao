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
  const { password } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "senha precisa ter 6+ caracteres" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(id, { password });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
