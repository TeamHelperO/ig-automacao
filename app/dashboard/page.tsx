import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import LogoutButton from "./logout-button";
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

  const { data: accounts } = await supabaseAdmin
    .from("accounts")
    .select("*")
    .eq("user_id", current.authUser.id)
    .order("connected_at", { ascending: false });

  const plan = current.profile?.plans;
  const maxAccounts = plan?.max_ig_accounts ?? 1;
  const usedAccounts = accounts?.length ?? 0;
  const atLimit = usedAccounts >= maxAccounts;

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-semibold text-neutral-900">
          Automação de Instagram
        </h1>
        <LogoutButton />
      </div>
      <p className="text-neutral-500 text-sm">
        Plano <strong>{plan?.name ?? "—"}</strong> · {usedAccounts}/{maxAccounts}{" "}
        contas conectadas
      </p>

      {params.conectado && (
        <div className="mt-6 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
          Conta conectada com sucesso!
        </div>
      )}
      {params.erro && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
          {decodeURIComponent(params.erro)}
        </div>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-900">
            Suas contas do Instagram
          </h2>
          {atLimit ? (
            <span className="text-xs text-neutral-500">
              Limite do plano atingido —{" "}
              <Link href="/dashboard/planos" className="underline">
                fazer upgrade
              </Link>
            </span>
          ) : (
            <a
              href="/api/oauth/login"
              className="text-sm bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium"
            >
              + Conectar Instagram
            </a>
          )}
        </div>

        {!accounts || accounts.length === 0 ? (
          <p className="text-sm text-neutral-500 bg-white border border-neutral-200 rounded-xl p-6 text-center">
            Nenhuma conta conectada ainda.
          </p>
        ) : (
          <ul className="space-y-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="bg-white border border-neutral-200 rounded-xl p-4 flex items-center justify-between"
              >
                <Link
                  href={`/dashboard/accounts/${account.id}`}
                  className="flex items-center gap-4 flex-1"
                >
                  {account.ig_profile_picture_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={account.ig_profile_picture_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <p className="font-medium text-neutral-900">
                      @{account.ig_username}
                    </p>
                    <p className="text-xs text-neutral-500">
                      Token válido até{" "}
                      {account.token_expires_at
                        ? new Date(account.token_expires_at).toLocaleDateString(
                            "pt-BR",
                            { timeZone: "America/Sao_Paulo" }
                          )
                        : "—"}
                    </p>
                  </div>
                </Link>
                <DisconnectButton accountId={account.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
