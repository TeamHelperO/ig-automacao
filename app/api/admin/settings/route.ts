import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/admin";

export async function GET() {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const admin = await requireSuperAdmin();
  if (!admin) return NextResponse.json({ error: "acesso negado" }, { status: 403 });

  const form = await req.formData();
  const appName = form.get("app_name") as string | null;
  const primaryColor = form.get("primary_color") as string | null;
  const accentColor = form.get("accent_color") as string | null;
  const file = form.get("logo") as File | null;

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (appName) update.app_name = appName;
  if (primaryColor) update.primary_color = primaryColor;
  if (accentColor) update.accent_color = accentColor;

  if (file && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) {
      return NextResponse.json({ error: "logo maior que 3MB" }, { status: 400 });
    }
    const ext = file.name.split(".").pop() || "png";
    const path = `logo-${Date.now()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabaseAdmin.storage
      .from("brand")
      .upload(path, buffer, { contentType: file.type, upsert: true });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: publicUrl } = supabaseAdmin.storage.from("brand").getPublicUrl(path);
    update.logo_url = publicUrl.publicUrl;
  }

  const { data, error } = await supabaseAdmin
    .from("system_settings")
    .update(update)
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
