import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ContatosPage({
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

  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("*, automations(name)")
    .eq("account_id", accountId)
    .order("first_contact_at", { ascending: false })
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
        <h1 className="font-display text-2xl font-medium text-[var(--ink)]">Contatos</h1>
        <Link
          href={`/dashboard/accounts/${accountId}/atividade`}
          className="text-sm text-[var(--ink-faint)] underline"
        >
          Ver atividade
        </Link>
      </div>

      {!contacts || contacts.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-[var(--ink-soft)]">
            Ninguém entrou em contato ainda. Assim que alguém comentar a
            palavra-chave, aparece aqui.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[var(--paper)] text-left text-xs text-[var(--ink-faint)]">
              <tr>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Automação</th>
                <th className="px-4 py-3">1º contato</th>
                <th className="px-4 py-3">Respondeu</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c: any) => (
                <tr key={c.id} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">
                    {c.username ? `@${c.username}` : <span className="mono text-xs">{c.ig_scoped_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-soft)]">
                    {c.automations?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-faint)] mono text-xs">
                    {new Date(c.first_contact_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    {c.last_response_at ? (
                      <span className="pill pill-signal">
                        <span className="pill-dot" /> sim
                      </span>
                    ) : (
                      <span className="pill pill-neutral">não</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
