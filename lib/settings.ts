import "server-only";
import { supabaseAdmin } from "./supabase";

export type SystemSettings = {
  app_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  accent_color: string;
};

const DEFAULTS: SystemSettings = {
  app_name: "Sinal",
  logo_url: null,
  favicon_url: null,
  primary_color: "#1E2240",
  accent_color: "#0FB87F",
};

export async function getSystemSettings(): Promise<SystemSettings> {
  const { data } = await supabaseAdmin
    .from("system_settings")
    .select("app_name, logo_url, favicon_url, primary_color, accent_color")
    .eq("id", 1)
    .maybeSingle();

  if (!data) return DEFAULTS;
  return {
    app_name: data.app_name || DEFAULTS.app_name,
    logo_url: data.logo_url,
    favicon_url: data.favicon_url,
    primary_color: data.primary_color || DEFAULTS.primary_color,
    accent_color: data.accent_color || DEFAULTS.accent_color,
  };
}
