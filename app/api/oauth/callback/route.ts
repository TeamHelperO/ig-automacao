import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForShortToken,
  exchangeForLongLivedToken,
  getProfile,
  subscribeWebhookFields,
} from "@/lib/instagram";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const errorParam = req.nextUrl.searchParams.get("error");

  if (errorParam || !code) {
    return NextResponse.redirect(
      `${process.env.APP_URL}/dashboard?erro=login_cancelado`
    );
  }

  const appId = process.env.IG_APP_ID!;
  const appSecret = process.env.IG_APP_SECRET!;
  const appUrl = process.env.APP_URL!;
  const redirectUri = `${appUrl}/api/oauth/callback`;

  try {
    // 1. code -> token curto
    const short = await exchangeCodeForShortToken({
      appId,
      appSecret,
      redirectUri,
      code,
    });

    // 2. token curto -> token longo (60 dias)
    const long = await exchangeForLongLivedToken({
      appSecret,
      shortToken: short.access_token,
    });

    // 3. perfil
    const profile = await getProfile(long.access_token);

    // 4. assina os campos do webhook nessa conta
    await subscribeWebhookFields({
      igUserId: profile.user_id,
      accessToken: long.access_token,
    });

    // 5. salva tudo na tabela config (1 linha só, id fixo = 1)
    const expiresAt = new Date(Date.now() + long.expires_in * 1000);
    const { error } = await supabaseAdmin.from("config").upsert({
      id: 1,
      ig_user_id: profile.user_id,
      ig_username: profile.username,
      ig_profile_picture_url: profile.profile_picture_url,
      access_token: long.access_token,
      token_expires_at: expiresAt.toISOString(),
      connected_at: new Date().toISOString(),
    });

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
