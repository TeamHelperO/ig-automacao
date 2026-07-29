"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function InsightsClient() {
  const params = useParams<{ accountId: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/accounts/${params.accountId}/insights`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [params.accountId]);

  if (loading) return <p className="text-sm text-[var(--ink-faint)]">Carregando...</p>;

  const accountMetrics: any[] = data?.account?.data ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      {data?.error && (
        <div className="card p-4 bg-[var(--amber-soft)] border-[var(--amber)]">
          <p className="text-sm text-[var(--amber)]">
            ⚠ Não deu pra buscar os insights ainda — provavelmente porque a permissão de
            insights ainda não foi aprovada pela Meta (Análise do App em andamento). Detalhe
            técnico: {data.error}
          </p>
        </div>
      )}

      {accountMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {accountMetrics.map((m: any) => (
            <div key={m.name} className="card p-4 text-center">
              <p className="font-display text-2xl text-[var(--ink)]">
                {m.total_value?.value ?? m.values?.[0]?.value ?? "—"}
              </p>
              <p className="text-xs text-[var(--ink-faint)] mt-1">{m.title || m.name}</p>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="text-sm font-medium text-[var(--ink-soft)] uppercase tracking-wide mb-3">
          Posts recentes
        </p>
        {(!data?.posts || data.posts.length === 0) && (
          <div className="card p-10 text-center">
            <p className="text-sm text-[var(--ink-soft)]">Nenhum dado de post disponível ainda.</p>
          </div>
        )}
        <ul className="space-y-2">
          {(data?.posts ?? []).map((p: any) => (
            <li key={p.media.id} className="card p-3.5 flex items-center gap-3">
              {p.media.thumbnail_url || p.media.media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.media.thumbnail_url || p.media.media_url}
                  alt=""
                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-[var(--paper)] shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-[var(--ink)] truncate">{p.media.caption || "(sem legenda)"}</p>
                <div className="flex gap-3 mt-1 text-xs text-[var(--ink-faint)] mono">
                  {p.insights.map((i: any) => (
                    <span key={i.name}>
                      {i.name}: {i.values?.[0]?.value ?? "—"}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
