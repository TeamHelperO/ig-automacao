"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { useBrand } from "@/components/brand-provider";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

const ACCOUNT_TABS = [
  { key: "", label: "Automações", icon: "⚡" },
  { key: "inbox", label: "Inbox", icon: "💬" },
  { key: "ia", label: "IA", icon: "✨" },
  { key: "contatos", label: "Contatos", icon: "👤" },
  { key: "atividade", label: "Atividade", icon: "📊" },
  { key: "equipe", label: "Equipe", icon: "🔑" },
];

type Account = {
  id: string;
  ig_username: string;
  ig_profile_picture_url: string | null;
};

export default function Sidebar({
  email,
  isSuperAdmin,
}: {
  email?: string;
  isSuperAdmin?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const { appName, logoUrl } = useBrand();

  const accountMatch = pathname.match(/\/dashboard\/accounts\/([^/]+)/);
  const accountId = accountMatch?.[1];
  const account = accounts.find((a) => a.id === accountId);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data ?? []));
  }, []);

  async function handleLogout() {
    const supabase = supabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="sidebar w-64 shrink-0 min-h-screen flex flex-col py-5">
      <Link href="/dashboard" className="flex items-center gap-2 px-4 mb-7">
        <BrandMark logoUrl={logoUrl} size={22} />
        <span className="font-display text-base font-medium tracking-tight">{appName}</span>
      </Link>

      {accountId ? (
        <>
          <div className="px-2 mb-3">
            <Link href="/dashboard" className="sidebar-item">
              <span aria-hidden>←</span> Todas as contas
            </Link>
          </div>

          {account && (
            <div className="flex items-center gap-2.5 px-4 py-2 mb-3">
              {account.ig_profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={account.ig_profile_picture_url}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/10 shrink-0" />
              )}
              <span className="text-sm text-white font-medium truncate">
                @{account.ig_username}
              </span>
            </div>
          )}

          <nav className="flex flex-col gap-0.5 px-2">
            {ACCOUNT_TABS.map((tab) => {
              const href = `/dashboard/accounts/${accountId}${tab.key ? `/${tab.key}` : ""}`;
              const active = tab.key
                ? pathname.includes(`/${tab.key}`)
                : pathname === `/dashboard/accounts/${accountId}` ||
                  pathname.includes("/automations");
              return (
                <Link
                  key={tab.key || "home"}
                  href={href}
                  className={`sidebar-item ${active ? "sidebar-item-active" : ""}`}
                >
                  <span aria-hidden>{tab.icon}</span> {tab.label}
                </Link>
              );
            })}
          </nav>
        </>
      ) : (
        <nav className="flex flex-col gap-0.5 px-2">
          <span className="sidebar-section-label mb-1.5">Geral</span>
          <Link
            href="/dashboard"
            className={`sidebar-item ${pathname === "/dashboard" ? "sidebar-item-active" : ""}`}
          >
            <span aria-hidden>🏠</span> Contas
          </Link>
          <Link
            href="/dashboard/planos"
            className={`sidebar-item ${pathname === "/dashboard/planos" ? "sidebar-item-active" : ""}`}
          >
            <span aria-hidden>💳</span> Planos
          </Link>
          <Link
            href="/dashboard/faturamento"
            className={`sidebar-item ${pathname === "/dashboard/faturamento" ? "sidebar-item-active" : ""}`}
          >
            <span aria-hidden>🧾</span> Faturamento
          </Link>
          {isSuperAdmin && (
            <Link href="/admin" className="sidebar-item">
              <span aria-hidden>🛡️</span> Painel admin
            </Link>
          )}
        </nav>
      )}

      <div className="mt-auto px-2 pt-4">
        <Link
          href="/dashboard/conta"
          className={`sidebar-item ${pathname === "/dashboard/conta" ? "sidebar-item-active" : ""}`}
        >
          <span aria-hidden>👤</span> Minha conta
        </Link>
        <button onClick={handleLogout} className="sidebar-item w-full text-left">
          <span aria-hidden>⏻</span> Sair
        </button>
        {email && (
          <p className="sidebar-section-label mt-3 truncate normal-case tracking-normal font-normal text-[11px]">
            {email}
          </p>
        )}
      </div>
    </aside>
  );
}
