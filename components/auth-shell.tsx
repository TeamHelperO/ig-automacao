import { SignalMark } from "./signal-mark";

export function AuthShell({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1fr_1.1fr]">
      <section className="app-nav hidden lg:flex flex-col justify-between px-16 py-14">
        <div className="flex items-center gap-2 text-white">
          <SignalMark size={26} />
          <span className="font-display text-lg font-medium tracking-tight">Sinal</span>
        </div>

        <div className="max-w-xs">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-3 mono">
            {eyebrow}
          </p>
          <h1 className="font-display text-3xl font-medium text-white leading-tight">
            {title}
          </h1>
        </div>

        <p className="text-xs text-white/40 mono">construído sobre a API oficial do Instagram</p>
      </section>

      <section className="flex items-center justify-center px-6 py-16 bg-[var(--paper)]">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <SignalMark size={22} />
            <span className="font-display text-base font-medium">Sinal</span>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
