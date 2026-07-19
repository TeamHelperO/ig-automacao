import { NextResponse } from "next/server";
import { buildLoginUrl } from "@/lib/instagram";

export async function GET() {
  const appId = process.env.IG_APP_ID!;
  const appUrl = process.env.APP_URL!;
  const redirectUri = `${appUrl}/api/oauth/callback`;

  const url = buildLoginUrl({ appId, redirectUri });
  return NextResponse.redirect(url);
}
