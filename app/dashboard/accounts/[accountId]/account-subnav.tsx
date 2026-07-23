"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function AccountSubnav({ accountId }: { accountId: string }) {
  const pathname = usePathname();
  const base = `/dashboard/accounts/${accountId}`;

  const tabs = [
    { href: base, label: "Automações", match: (p: string) => p === base || p.includes("/automations") },
    { href: `${base}/inbox`, label: "Inbox", match: (p: string) => p.includes("/inbox") },
    { href: `${base}/contatos`, label: "Contatos", match: (p: string) => p.includes("/contatos") },
    { href: `${base}/atividade`, label: "Atividade", match: (p: string) => p.includes("/atividade") },
    { href: `${base}/equipe`, label: "Equipe", match: (p: string) => p.includes("/equipe") },
  ];

  return (
    <div className="flex gap-1 border-b border-[var(--border)]">
      {tabs.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              active
                ? "border-[var(--indigo)] text-[var(--ink)]"
                : "border-transparent text-[var(--ink-faint)] hover:text-[var(--ink-soft)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
