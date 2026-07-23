import { NextResponse } from "next/server";
import { buildLoginUrl } from "@/lib/instagram";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { supabaseAdmin } from "@/lib/supabase";
import { isTrialExpired } from "@/lib/access";

export async function GET() {
  const appUrl = process.env.APP_URL!;
  const current = await getCurrentUser();

  if (!current) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  if (current.profile && isTrialExpired(current.profile as any)) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?erro=${encodeURIComponent(
        "Seu período grátis acabou. Assine um plano pra continuar."
      )}`
    );
  }

  const maxAccounts = current.profile?.plans?.max_ig_accounts ?? 1;
  const { count } = await supabaseAdmin
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", current.authUser.id);

  if ((count ?? 0) >= maxAccounts) {
    return NextResponse.redirect(
      `${appUrl}/dashboard?erro=${encodeURIComponent(
        "Limite de contas do seu plano atingido. Faça upgrade pra conectar mais."
      )}`
    );
  }

  const appId = process.env.IG_APP_ID!;
  const redirectUri = `${appUrl}/api/oauth/callback`;

  const url = buildLoginUrl({ appId, redirectUri, state: current.authUser.id });
  return NextResponse.redirect(url);
}
