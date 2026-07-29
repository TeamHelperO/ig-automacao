import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin
    .from("plan_features")
    .select("*")
    .eq("plan_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PUT { features: [{ feature_key, enabled, limit_value }] } -> substitui tudo de uma vez
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { id } = await params;
  const { features } = await req.json();
  if (!Array.isArray(features)) {
    return NextResponse.json({ error: "features precisa ser um array" }, { status: 400 });
  }

  const rows = features.map((f: any) => ({
    plan_id: id,
    feature_key: f.feature_key,
    enabled: Boolean(f.enabled),
    limit_value: f.enabled && f.limit_value !== null && f.limit_value !== undefined ? Number(f.limit_value) : null,
  }));

  const { error } = await supabaseAdmin
    .from("plan_features")
    .upsert(rows, { onConflict: "plan_id,feature_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
