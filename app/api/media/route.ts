import { NextRequest, NextResponse } from "next/server";
import { listMedia } from "@/lib/instagram";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";

export async function GET(req: NextRequest) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const accountId = req.nextUrl.searchParams.get("account_id");
  if (!accountId) return NextResponse.json({ error: "account_id obrigatório" }, { status: 400 });

  const account = await ensureAccountAccess(accountId, current.authUser.id);

  if (!account?.access_token || !account.ig_user_id) {
    return NextResponse.json({ error: "conta não encontrada ou não conectada" }, { status: 404 });
  }

  try {
    const result = await listMedia({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
      limit: 30,
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
