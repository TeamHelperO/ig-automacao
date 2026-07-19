import Link from "next/link";
import { SignalMark } from "@/components/signal-mark";
import { getCurrentUser } from "@/lib/supabase-server-auth";
import LogoutButton from "./logout-button";

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
          <Link href="/dashboard" className="flex items-center gap-2 text-white">
            <SignalMark size={22} />
            <span className="font-display text-base font-medium tracking-tight">
              Sinal
            </span>
          </Link>
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/dashboard/conta" className="text-white/70 hover:text-white">
              Minha conta
            </Link>
            <Link href="/dashboard/planos" className="text-white/70 hover:text-white">
              Planos
            </Link>
            {current?.profile?.is_super_admin && (
              <Link href="/admin" className="text-white/70 hover:text-white">
                Admin
              </Link>
            )}
            <span className="text-white/40 mono text-xs hidden sm:inline">
              {current?.authUser.email}
            </span>
            <LogoutButton />
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
