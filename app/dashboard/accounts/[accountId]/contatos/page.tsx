import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function ContatosPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;

  const { data: contacts } = await supabaseAdmin
    .from("contacts")
    .select("*, automations(name)")
    .eq("account_id", accountId)
    .order("first_contact_at", { ascending: false })
    .limit(200);

  if (!contacts || contacts.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm text-[var(--ink-soft)]">
          Ninguém entrou em contato ainda. Assim que alguém comentar a
          palavra-chave, aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-[var(--ink-faint)] mb-3">
        💬 veio de um comentário (Instagram entrega o @) · ✉️ veio de DM direta (Instagram só
        entrega um ID numérico, sem @ — limitação da própria API)
      </p>
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
                <span className="inline-flex items-center gap-1.5">
                  <span title={c.username ? "veio de um comentário" : "veio de DM direta"} className="text-xs">
                    {c.username ? "💬" : "✉️"}
                  </span>
                  {c.username ? `@${c.username}` : <span className="mono text-xs">{c.ig_scoped_id}</span>}
                </span>
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
    </div>
  );
}
