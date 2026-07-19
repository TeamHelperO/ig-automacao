import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  private_reply: "resposta privada",
  public_reply: "resposta pública",
  dm: "dm de boas-vindas",
  link: "envio do link",
  reminder: "lembrete",
};

const STATUS_PILL: Record<string, string> = {
  sent: "pill-signal",
  pending: "pill-amber",
  sending: "pill-amber",
  failed: "pill-coral",
  skipped: "pill-neutral",
};

const STATUS_LABEL: Record<string, string> = {
  sent: "enviado",
  pending: "na fila",
  sending: "enviando",
  failed: "falhou",
  skipped: "pulado",
};

export default async function AtividadePage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", current.authUser.id)
    .maybeSingle();

  if (!account) redirect("/dashboard");

  const { data: items } = await supabaseAdmin
    .from("queue")
    .select("*, contacts(username, ig_scoped_id), automations(name)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <Link
        href={`/dashboard/accounts/${accountId}`}
        className="text-sm text-[var(--ink-faint)]"
      >
        ← @{account.ig_username}
      </Link>
      <div className="flex items-center justify-between mt-3 mb-8">
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">Atividade</h1>
        <Link
          href={`/dashboard/accounts/${accountId}/contatos`}
          className="text-sm text-[var(--ink-faint)] underline"
        >
          Ver contatos
        </Link>
      </div>

      {!items || items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            Nenhuma ação registrada ainda. Toda mensagem enviada, pulada ou
            que falhar aparece aqui.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item: any) => (
            <li
              key={item.id}
              className="card p-3.5 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm text-[var(--ink)]">
                  <span className="font-medium">
                    {item.contacts?.username
                      ? `@${item.contacts.username}`
                      : item.contacts?.ig_scoped_id ?? "—"}
                  </span>{" "}
                  <span className="text-[var(--ink-faint)]">
                    · {KIND_LABEL[item.kind] ?? item.kind}
                    {item.automations?.name ? ` · ${item.automations.name}` : ""}
                  </span>
                </p>
                {item.error && (
                  <p className="text-xs text-[var(--coral)] mt-0.5 truncate">{item.error}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-[var(--ink-faint)] mono">
                  {new Date(item.created_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                  })}
                </span>
                <span className={`pill ${STATUS_PILL[item.status] ?? "pill-neutral"}`}>
                  <span className="pill-dot" /> {STATUS_LABEL[item.status] ?? item.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
