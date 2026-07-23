import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";

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
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams: Promise<{ erros?: string }>;
}) {
  const { accountId } = await params;
  const { erros } = await searchParams;
  const onlyErrors = erros === "1";

  const { data: account } = await supabaseAdmin
    .from("accounts")
    .select("*, user_id")
    .eq("id", accountId)
    .maybeSingle();

  const { data: profile } = account
    ? await supabaseAdmin
        .from("profiles")
        .select("*, plans(*)")
        .eq("id", account.user_id)
        .maybeSingle()
    : { data: null };

  const { count: contactsCount } = await supabaseAdmin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);

  const { count: sentCount } = await supabaseAdmin
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .eq("status", "sent");

  const { count: linksTotal } = await supabaseAdmin
    .from("link_clicks")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId);

  const { count: linksClicked } = await supabaseAdmin
    .from("link_clicks")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .not("clicked_at", "is", null);

  const { count: failedLast24h } = await supabaseAdmin
    .from("queue")
    .select("id", { count: "exact", head: true })
    .eq("account_id", accountId)
    .in("status", ["failed", "skipped"])
    .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  let itemsQuery = supabaseAdmin
    .from("queue")
    .select("*, contacts(username, ig_scoped_id), automations(name)")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (onlyErrors) itemsQuery = itemsQuery.in("status", ["failed", "skipped"]);

  const { data: items } = await itemsQuery;

  // --- saúde da conta ---
  const tokenExpiresAt = account?.token_expires_at ? new Date(account.token_expires_at) : null;
  const tokenDaysLeft = tokenExpiresAt
    ? Math.floor((tokenExpiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;
  const tokenWarning = tokenDaysLeft !== null && tokenDaysLeft <= 7;

  const plan = profile?.plans;
  const isFreeTrial = plan && plan.price_cents === 0 && plan.trial_days;
  let trialDaysLeft: number | null = null;
  let trialExpired = false;
  if (isFreeTrial && profile?.plan_started_at) {
    const startedAt = new Date(profile.plan_started_at);
    const expiresAt = new Date(startedAt.getTime() + plan.trial_days * 24 * 60 * 60 * 1000);
    trialDaysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    trialExpired = trialDaysLeft < 0;
  }

  let messagesThisMonth = 0;
  if (plan?.max_messages_per_month) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const { count } = await supabaseAdmin
      .from("queue")
      .select("id", { count: "exact", head: true })
      .eq("account_id", accountId)
      .eq("status", "sent")
      .gte("sent_at", startOfMonth.toISOString());
    messagesThisMonth = count ?? 0;
  }
  const quotaExceeded = plan?.max_messages_per_month
    ? messagesThisMonth >= plan.max_messages_per_month
    : false;

  const hasWarning = tokenWarning || trialExpired || quotaExceeded || (failedLast24h ?? 0) > 0;

  return (
    <div>
      {hasWarning && (
        <div className="card p-4 mb-6 border-[var(--coral)]">
          <p className="text-sm font-medium text-[var(--ink)] mb-2">⚠ Saúde da conta</p>
          <ul className="text-sm text-[var(--ink-soft)] space-y-1">
            {tokenWarning && (
              <li className="text-[var(--coral)]">
                Token do Instagram expira em {tokenDaysLeft} dia(s) — deveria renovar sozinho
                (cron semanal), mas fica de olho.
              </li>
            )}
            {trialExpired && (
              <li className="text-[var(--coral)]">
                Trial do plano grátis venceu — automações não estão mais enviando.{" "}
                <Link href="/dashboard/planos" className="underline">
                  Ver planos
                </Link>
              </li>
            )}
            {quotaExceeded && (
              <li className="text-[var(--coral)]">
                Limite de {plan?.max_messages_per_month} mensagens do plano atingido neste mês
                ({messagesThisMonth} enviadas) — envios pausados até o mês seguinte ou upgrade.
              </li>
            )}
            {(failedLast24h ?? 0) > 0 && (
              <li>
                {failedLast24h} item(ns) falhou/pulou nas últimas 24h.{" "}
                <Link href="?erros=1" className="underline">
                  Ver só os erros
                </Link>
              </li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card p-4 text-center">
          <p className="font-display text-2xl text-[var(--ink)]">{contactsCount ?? 0}</p>
          <p className="text-xs text-[var(--ink-faint)] mt-1">contatos</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl text-[var(--ink)]">{sentCount ?? 0}</p>
          <p className="text-xs text-[var(--ink-faint)] mt-1">mensagens enviadas</p>
        </div>
        <div className="card p-4 text-center">
          <p className="font-display text-2xl text-[var(--ink)]">
            {linksClicked ?? 0}
            <span className="text-sm text-[var(--ink-faint)]">/{linksTotal ?? 0}</span>
          </p>
          <p className="text-xs text-[var(--ink-faint)] mt-1">links clicados</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Link
          href={onlyErrors ? "?" : "?erros=1"}
          className={`pill ${onlyErrors ? "pill-coral" : "pill-neutral"}`}
        >
          {onlyErrors ? "✕ mostrando só erros" : "filtrar só erros"}
        </Link>
      </div>

      {!items || items.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            {onlyErrors
              ? "Nenhum erro registrado. 🎉"
              : "Nenhuma ação registrada ainda. Toda mensagem enviada, pulada ou que falhar aparece aqui."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item: any) => (
            <li key={item.id} className="card p-3.5 flex items-center justify-between gap-3">
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
    </div>
  );
}
