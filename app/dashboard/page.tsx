import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import DisconnectButton from "./disconnect-button";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentUser();
  if (!current) return null;

  const { data: ownedAccounts } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("user_id", current.authUser.id)
    .order("connected_at", { ascending: false });

  const { data: collabRows } = await supabaseAdmin
    .from("account_collaborators")
    .select("accounts(*)")
    .eq("user_id", current.authUser.id);

  const collabAccounts = (collabRows ?? [])
    .map((r: any) => r.accounts)
    .filter(Boolean);

  const plan = current.profile?.plans;
  const maxAccounts = plan?.max_ig_accounts ?? 1;
  const usedAccounts = ownedAccounts?.length ?? 0;
  const atLimit = usedAccounts >= maxAccounts;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-end justify-between mb-1">
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">
          Suas contas
        </h1>
        <span className="pill pill-neutral mono">
          plano {plan?.name?.toLowerCase() ?? "—"} · {usedAccounts}/{maxAccounts}
        </span>
      </div>
      <p className="text-[var(--ink-soft)] text-sm mb-8">
        Cada card é uma conta de Instagram com suas próprias automações.
      </p>

      {params.conectado && (
        <div className="mb-6 pill pill-signal">
          <span className="pill-dot" /> Conta conectada com sucesso
        </div>
      )}
      {params.erro && (
        <div className="mb-6 bg-[var(--coral-soft)] text-[var(--coral)] text-sm rounded-lg px-4 py-3">
          {decodeURIComponent(params.erro)}
        </div>
      )}

      <div className="flex items-center justify-end mb-4">
        {atLimit ? (
          <span className="text-xs text-[var(--ink-faint)]">
            Limite do plano atingido —{" "}
            <Link href="/dashboard/planos" className="underline text-[var(--ink)]">
              fazer upgrade
            </Link>
          </span>
        ) : (
          <a href="/api/oauth/login" className="btn btn-signal">
            + Conectar Instagram
          </a>
        )}
      </div>

      {(!ownedAccounts || ownedAccounts.length === 0) && collabAccounts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            Nenhuma conta conectada ainda. Conecte a primeira pra criar automações.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {(ownedAccounts ?? []).map((account) => (
            <li key={account.id} className="card p-4 flex items-center justify-between">
              <Link
                href={`/dashboard/accounts/${account.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                {account.ig_profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.ig_profile_picture_url}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--paper)] border border-[var(--border)] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[var(--ink)] truncate">
                    @{account.ig_username}
                  </p>
                  <p className="text-xs text-[var(--ink-faint)] mono">
                    token até{" "}
                    {account.token_expires_at
                      ? new Date(account.token_expires_at).toLocaleDateString("pt-BR", {
                          timeZone: "America/Sao_Paulo",
                        })
                      : "—"}
                  </p>
                </div>
              </Link>
              <DisconnectButton accountId={account.id} />
            </li>
          ))}

          {collabAccounts.map((account: any) => (
            <li key={account.id} className="card p-4 flex items-center justify-between">
              <Link
                href={`/dashboard/accounts/${account.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                {account.ig_profile_picture_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={account.ig_profile_picture_url}
                    alt=""
                    className="w-11 h-11 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[var(--paper)] border border-[var(--border)] shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-[var(--ink)] truncate">
                    @{account.ig_username}
                  </p>
                  <p className="text-xs text-[var(--ink-faint)]">você é colaborador</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
