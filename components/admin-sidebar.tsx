"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { useBrand } from "@/components/brand-provider";

const ITEMS = [
  { href: "/admin", label: "Usuários", icon: "👤" },
  { href: "/admin/planos", label: "Planos", icon: "💳" },
  { href: "/admin/financeiro", label: "Financeiro", icon: "📈" },
  { href: "/admin/configuracoes", label: "Configurações", icon: "⚙️" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { appName, logoUrl } = useBrand();

  return (
    <aside className="sidebar w-64 shrink-0 min-h-screen flex flex-col py-5">
      <div className="flex items-center gap-2 px-4 mb-1">
        <BrandMark logoUrl={logoUrl} size={22} />
        <span className="font-display text-base font-medium tracking-tight">{appName}</span>
      </div>
      <div className="px-4 mb-6">
        <span className="pill pill-amber">super admin</span>
      </div>

      <nav className="flex flex-col gap-0.5 px-2">
        <span className="sidebar-section-label mb-1.5">Painel</span>
        {ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-item ${pathname === item.href ? "sidebar-item-active" : ""}`}
          >
            <span aria-hidden>{item.icon}</span> {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto px-2 pt-4">
        <Link href="/dashboard" className="sidebar-item">
          <span aria-hidden>←</span> Ir pro meu painel
        </Link>
      </div>
    </aside>
  );
}
