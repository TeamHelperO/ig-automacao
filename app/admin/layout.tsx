import Link from "next/link";
import { SignalMark } from "@/components/signal-mark";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--paper)]">
      <header className="app-nav">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Link href="/admin" className="flex items-center gap-2 text-white">
              <SignalMark size={22} />
              <span className="font-display text-base font-medium tracking-tight">
                Sinal
              </span>
              <span className="pill pill-amber ml-1">super admin</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link href="/admin" className="text-white/70 hover:text-white">
                Usuários
              </Link>
              <Link href="/admin/planos" className="text-white/70 hover:text-white">
                Planos
              </Link>
              <Link href="/admin/financeiro" className="text-white/70 hover:text-white">
                Financeiro
              </Link>
            </nav>
          </div>
          <Link href="/dashboard" className="text-white/70 hover:text-white text-sm">
            Ir pro meu painel
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
