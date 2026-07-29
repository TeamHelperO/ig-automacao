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

  const collabAccounts = (collabRows ?? []).map((r: any) => r.accounts).filter(Boolean);

  const plan = current.profile?.plans;
  const maxAccounts = plan?.max_ig_accounts ?? 1;
  const usedAccounts = ownedAccounts?.length ?? 0;
  const atLimit = usedAccounts >= maxAccounts;
  const allAccounts = [
    ...(ownedAccounts ?? []).map((a) => ({ ...a, role: "owner" as const })),
    ...collabAccounts.map((a: any) => ({ ...a, role: "collaborator" as const })),
  ];

  return (
    <main className="max-w-5xl px-10 py-10">
      <div className="flex items-end justify-between mb-1">
        <h1 className="font-display text-[28px] font-medium text-[var(--ink)]">Suas contas</h1>
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

      {!atLimit && (
        <a
          href="/api/oauth/login"
          className="card card-interactive flex items-center justify-center gap-2 p-6 mb-4 border-dashed text-[var(--ink-soft)] hover:text-[var(--indigo)]"
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-sm font-medium">Conectar Instagram</span>
        </a>
      )}
      {atLimit && (
        <div className="flex items-center justify-end mb-4">
          <span className="text-xs text-[var(--ink-faint)]">
            Limite do plano atingido —{" "}
            <Link href="/dashboard/planos" className="underline text-[var(--ink)]">
              fazer upgrade
            </Link>
          </span>
        </div>
      )}

      {allAccounts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            Nenhuma conta conectada ainda. Conecte a primeira pra criar automações.
          </p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAccounts.map((account) => (
            <div key={account.id} className="card card-interactive p-5 relative group">
              <Link href={`/dashboard/accounts/${account.id}`} className="block">
                <div className="flex items-center gap-3 mb-4">
                  {account.ig_profile_picture_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.ig_profile_picture_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-[var(--border)]"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-[var(--paper)] border border-[var(--border)] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)] truncate">@{account.ig_username}</p>
                    <p className="text-xs text-[var(--ink-faint)]">
                      {account.role === "owner" ? "sua conta" : "você é colaborador"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--ink-faint)] mono">
                    {account.role === "owner"
                      ? `token até ${
                          account.token_expires_at
                            ? new Date(account.token_expires_at).toLocaleDateString("pt-BR", {
                                timeZone: "America/Sao_Paulo",
                              })
                            : "—"
                        }`
                      : ""}
                  </span>
                  <span className="text-xs font-medium text-[var(--indigo)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Abrir →
                  </span>
                </div>
              </Link>
              {account.role === "owner" && (
                <div className="absolute top-4 right-4">
                  <DisconnectButton accountId={account.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
