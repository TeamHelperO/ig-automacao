import { supabaseAdmin } from "@/lib/supabase";
import Link from "next/link";
import AutomationsList from "./automations-list";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ conectado?: string; erro?: string }>;
}) {
  const params = await searchParams; // Next 16: searchParams é assíncrono

  const { data: config } = await supabaseAdmin
    .from("config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  const { data: automations } = await supabaseAdmin
    .from("automations")
    .select("*")
    .order("created_at", { ascending: false });

  const connected = Boolean(config?.access_token);

  return (
    <main className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-semibold text-neutral-900">
        Automação de Instagram
      </h1>
      <p className="text-neutral-500 text-sm mt-1">
        Comentário vira DM. Sem mensalidade, roda no plano grátis.
      </p>

      {params.conectado && (
        <div className="mt-6 bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg px-4 py-3">
          Conta conectada com sucesso!
        </div>
      )}
      {params.erro && (
        <div className="mt-6 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-3">
          Erro: {decodeURIComponent(params.erro)}
        </div>
      )}

      <section className="mt-8 bg-white border border-neutral-200 rounded-xl p-6">
        {connected ? (
          <div className="flex items-center gap-4">
            {config?.ig_profile_picture_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={config.ig_profile_picture_url}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
            )}
            <div>
              <p className="font-medium text-neutral-900">
                @{config?.ig_username}
              </p>
              <p className="text-xs text-neutral-500">
                Token válido até{" "}
                {config?.token_expires_at
                  ? new Date(config.token_expires_at).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })
                  : "—"}
              </p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-neutral-600 mb-4">
              Nenhuma conta conectada ainda.
            </p>
            <a
              href="/api/oauth/login"
              className="inline-block bg-neutral-900 text-white rounded-lg px-4 py-2 text-sm font-medium"
            >
              Conectar Instagram
            </a>
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-neutral-900">Automações</h2>
          <Link
            href="/dashboard/automations/nova"
            className="text-sm bg-neutral-900 text-white rounded-lg px-4 py-2 font-medium"
          >
            + Nova automação
          </Link>
        </div>
        <AutomationsList initialAutomations={automations ?? []} />
      </section>
    </main>
  );
}
