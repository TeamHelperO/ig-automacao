import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/admin";

export async function GET() {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select("*, plans(*)")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: accounts } = await supabaseAdmin.from("accounts").select("id, user_id");
  const countByUser = new Map<string, number>();
  for (const a of accounts ?? []) {
    countByUser.set(a.user_id, (countByUser.get(a.user_id) ?? 0) + 1);
  }

  const data = (profiles ?? []).map((p) => ({
    ...p,
    accounts_count: countByUser.get(p.id) ?? 0,
  }));

  return NextResponse.json({ data });
}
