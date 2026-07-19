import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountOwnership } from "@/lib/ownership";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountOwnership(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("account_collaborators")
    .select("*, profiles(email)")
    .eq("account_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountOwnership(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email obrigatório" }, { status: 400 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!profile) {
    return NextResponse.json(
      { error: "Essa pessoa ainda não tem conta no Sinal. Peça pra ela se cadastrar primeiro em /signup." },
      { status: 404 }
    );
  }

  if (profile.id === current.authUser.id) {
    return NextResponse.json({ error: "Você já tem acesso a essa conta." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("account_collaborators")
    .insert({ account_id: id, user_id: profile.id })
    .select("*, profiles(email)")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Essa pessoa já é colaboradora dessa conta." }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
