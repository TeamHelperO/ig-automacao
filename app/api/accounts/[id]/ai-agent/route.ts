import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { data } = await supabaseAdmin
    .from("ai_agents")
    .select("*")
    .eq("account_id", id)
    .maybeSingle();

  return NextResponse.json({ data: data ?? { account_id: id, enabled: false, system_prompt: "" } });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id } = await params;
  const account = await ensureAccountAccess(id, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const { enabled, system_prompt, max_response_chars, temperature, simulate_typing } = await req.json();

  const { data, error } = await supabaseAdmin
    .from("ai_agents")
    .upsert(
      {
        account_id: id,
        enabled,
        system_prompt,
        max_response_chars: max_response_chars ?? 300,
        temperature: temperature ?? 0.7,
        simulate_typing: simulate_typing ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "account_id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
