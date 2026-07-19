import Link from "next/link";
import { SignalMark } from "@/components/signal-mark";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import { DropdownMenu, DropdownItem } from "@/components/dropdown-menu";
import LogoutMenuItem from "./logout-menu-item";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const current = await getCurrentUser();

  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="app-nav">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-white">
              <SignalMark size={22} />
              <span className="font-display text-base font-medium tracking-tight">
                Sinal
              </span>
            </Link>
            <nav className="hidden sm:flex items-center gap-5 text-sm">
              <Link href="/dashboard" className="text-white/70 hover:text-white">
                Contas
              </Link>
              <Link href="/dashboard/planos" className="text-white/70 hover:text-white">
                Planos
              </Link>
              {current?.profile?.is_super_admin && (
                <DropdownMenu label="Admin">
                  <DropdownItem href="/admin">Usuários</DropdownItem>
                  <DropdownItem href="/admin/planos">Gerenciar planos</DropdownItem>
                </DropdownMenu>
              )}
            </nav>
          </div>

          <DropdownMenu
            label={
              <span className="mono text-xs max-w-[140px] truncate">
                {current?.authUser.email}
              </span>
            }
          >
            <div className="sm:hidden border-b border-[var(--border)] pb-1 mb-1">
              <DropdownItem href="/dashboard">Contas</DropdownItem>
              <DropdownItem href="/dashboard/planos">Planos</DropdownItem>
              {current?.profile?.is_super_admin && (
                <DropdownItem href="/admin">Admin</DropdownItem>
              )}
            </div>
            <DropdownItem href="/dashboard/conta">Minha conta</DropdownItem>
            <LogoutMenuItem />
          </DropdownMenu>
        </div>
      </header>
      {children}
    </div>
  );
}
