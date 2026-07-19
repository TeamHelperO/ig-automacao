import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/admin";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("plans")
    .select("*")
    .order("price_cents", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const body = await req.json();
  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      name: body.name,
      price_cents: body.price_cents ?? 0,
      max_ig_accounts: body.max_ig_accounts ?? 1,
      active: body.active ?? true,
    })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
