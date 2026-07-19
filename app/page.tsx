import Link from "next/link";
import { SignalMark } from "@/components/signal-mark";

export default function Home() {
  return (
    <main className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* painel de marca */}
      <section className="app-nav relative flex flex-col justify-between px-8 py-10 lg:px-16 lg:py-14 overflow-hidden">
        <div className="flex items-center gap-2 text-white">
          <SignalMark size={26} />
          <span className="font-display text-lg font-medium tracking-tight">Sinal</span>
        </div>

        <div className="max-w-md">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4 mono">
            comentário → dm
          </p>
          <h1 className="font-display text-4xl lg:text-5xl font-medium text-white leading-[1.08] mb-6">
            Toda palavra-chave vira uma conversa.
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Alguém comenta a palavra certa no seu post, story ou reels — e o
            Sinal manda a DM na hora. Sem mensalidade de ferramenta terceira,
            sem depender de virar refém do ManyChat.
          </p>
        </div>

        <p className="text-xs text-white/40 mono">
          construído sobre a API oficial do Instagram
        </p>

        <div
          aria-hidden
          className="absolute -right-24 -bottom-24 w-80 h-80 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, var(--signal), transparent 70%)" }}
        />
      </section>

      {/* painel de ação */}
      <section className="flex items-center justify-center px-8 py-16 bg-[var(--paper)]">
        <div className="max-w-sm w-full text-center">
          <h2 className="font-display text-2xl font-medium text-[var(--ink)] mb-2">
            Comece agora
          </h2>
          <p className="text-sm text-[var(--ink-soft)] mb-8">
            Grátis pra testar em 1 conta de Instagram.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/signup" className="btn btn-primary w-full py-3">
              Criar conta grátis
            </Link>
            <Link href="/login" className="btn btn-outline w-full py-3">
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
