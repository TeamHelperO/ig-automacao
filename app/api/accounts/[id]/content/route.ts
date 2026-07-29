import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from("content_posts")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
