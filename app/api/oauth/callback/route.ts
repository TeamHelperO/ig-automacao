import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortToken,
  exchangeForLongLivedToken,
  getProfile,
  subscribeWebhookFields,
} from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");
  const appUrl = process.env.APP_URL!;

  if (errorParam || !code) {
    return NextResponse.redirect(`${appUrl}/dashboard?erro=login_cancelado`);
  }

  const current = await getCurrentUser();
  if (!current) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const appId = process.env.IG_APP_ID!;
  const appSecret = process.env.IG_APP_SECRET!;
  const redirectUri = `${appUrl}/api/oauth/callback`;

  try {
    // checa o limite do plano de novo (segurança contra corrida)
    const maxAccounts = current.profile?.plans?.max_ig_accounts ?? 1;
    const { count } = await supabaseAdmin
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", current.authUser.id);

    if ((count ?? 0) >= maxAccounts) {
      return NextResponse.redirect(
        `${appUrl}/dashboard?erro=${encodeURIComponent(
          "Limite de contas do seu plano atingido."
        )}`
      );
    }

    const short = await exchangeCodeForShortToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    const long = await exchangeForLongLivedToken({
      appSecret,
      shortToken: short.access_token,
    });

    const profile = await getProfile(long.access_token);

    await subscribeWebhookFields({
      igUserId: profile.user_id,
      accessToken: long.access_token,
    });

    const expiresAt = new Date(Date.now() + long.expires_in * 1000);
    const { error } = await supabaseAdmin.from("accounts").upsert(
      {
        user_id: current.authUser.id,
        ig_user_id: profile.user_id,
        ig_username: profile.username,
        ig_profile_picture_url: profile.profile_picture_url,
        access_token: long.access_token,
        token_expires_at: expiresAt.toISOString(),
        connected_at: new Date().toISOString(),
      },
      { onConflict: "ig_user_id" }
    );

    if (error) throw new Error(error.message);

    return NextResponse.redirect(`${appUrl}/dashboard?conectado=1`);
  } catch (err) {
    console.error("Erro no callback do OAuth:", err);
    const msg = err instanceof Error ? err.message : "erro_desconhecido";
    return NextResponse.redirect(
      `${appUrl}/dashboard?erro=${encodeURIComponent(msg)}`
    );
  }
}
