import { NextRequest, NextResponse } from "next/server";

// No Next 16 o arquivo middleware.ts foi renomeado para proxy.ts,
// exportando uma função `proxy` em vez de `middleware`.
export function proxy(req: NextRequest) {
  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  if (!isDashboard) return NextResponse.next();

  const cookie = req.cookies.get("dashboard_auth")?.value;
  if (cookie === process.env.DASHBOARD_PASSWORD) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
