import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (!process.env.DASHBOARD_PASSWORD) {
    return NextResponse.json(
      { error: "DASHBOARD_PASSWORD não configurada no servidor" },
      { status: 500 }
    );
  }

  if (password !== process.env.DASHBOARD_PASSWORD) {
    return new NextResponse("Senha incorreta", { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dashboard_auth", password, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: "/",
  });
  return res;
}
