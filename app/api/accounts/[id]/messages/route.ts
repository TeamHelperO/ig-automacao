import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { ensureAccountAccess } from "@/lib/ownership";
import { sendMessage } from "@/lib/instagram";

const WINDOW_MS = 24 * 60 * 60 * 1000;

// GET ?contact_id=xxx  -> histórico da conversa com esse contato
// GET (sem contact_id) -> lista de conversas (contato + última mensagem)
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  const contactId = req.nextUrl.searchParams.get("contact_id");

  if (contactId) {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("*")
      .eq("account_id", accountId)
      .eq("contact_id", contactId)
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  // lista de conversas: contatos que já têm pelo menos 1 mensagem, com a última
  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("account_id", accountId)
    .order("last_response_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const contactIds = (contacts ?? []).map((c) => c.id);
  const { data: lastMessages } = await supabaseAdmin
    .from("messages")
    .select("contact_id, text, direction, created_at")
    .in("contact_id", contactIds.length ? contactIds : ["00000000-0000-0000-0000-000000000000"])
    .order("created_at", { ascending: false });

  const lastByContact = new Map<string, any>();
  for (const m of lastMessages ?? []) {
    if (!lastByContact.has(m.contact_id)) lastByContact.set(m.contact_id, m);
  }

  const conversations = (contacts ?? [])
    .filter((c) => lastByContact.has(c.id))
    .map((c) => ({
      ...c,
      last_message: lastByContact.get(c.id),
      window_open: c.last_response_at
        ? Date.now() - new Date(c.last_response_at).getTime() < WINDOW_MS
        : false,
    }))
    .sort(
      (a, b) =>
        new Date(b.last_message.created_at).getTime() - new Date(a.last_message.created_at).getTime()
    );

  return NextResponse.json({ data: conversations });
}

// POST { contact_id, text } -> manda uma DM manual pra esse contato agora
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const current = await getCurrentUser();
  if (!current) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const { id: accountId } = await params;
  const account = await ensureAccountAccess(accountId, current.authUser.id);
  if (!account) return NextResponse.json({ error: "conta não encontrada" }, { status: 404 });

  if (!account.access_token || !account.ig_user_id) {
    return NextResponse.json({ error: "conta não conectada" }, { status: 400 });
  }

  const { contact_id, text } = await req.json();
  if (!contact_id || !text?.trim()) {
    return NextResponse.json({ error: "dados incompletos" }, { status: 400 });
  }

  const { data: contact } = await supabaseAdmin
    .from("contacts")
    .select("*")
    .eq("id", contact_id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!contact) return NextResponse.json({ error: "contato não encontrado" }, { status: 404 });

  const windowOpen =
    contact.last_response_at && Date.now() - new Date(contact.last_response_at).getTime() < WINDOW_MS;

  if (!windowOpen) {
    return NextResponse.json(
      {
        error:
          "A janela de 24h dessa conversa está fechada (regra do Instagram, não dá pra contornar). Só é possível responder de novo depois que a pessoa mandar outra mensagem.",
      },
      { status: 400 }
    );
  }

  try {
    await sendMessage({
      igUserId: account.ig_user_id,
      accessToken: account.access_token,
      recipient: { id: contact.ig_scoped_id },
      text,
    });

    await supabaseAdmin.from("messages").insert({
      account_id: accountId,
      contact_id,
      direction: "outbound",
      text,
      source: "manual",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
