import Link from "next/link";
import { SignalMark } from "@/components/signal-mark";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: "⚡",
    title: "Comentário vira DM",
    desc: "Alguém comenta a palavra-chave certa no seu post, reels ou story — e a mensagem sai na hora, automaticamente.",
  },
  {
    icon: "🧩",
    title: "Construtor visual",
    desc: "Monta o fluxo inteiro em blocos conectados por linha: gatilho, resposta pública, DM, link, lembrete — do jeito que fizer sentido pro seu negócio.",
  },
  {
    icon: "🤖",
    title: "Respostas com IA",
    desc: "Em vez de repetir a mesma frase pra todo mundo, deixa a IA gerar variações naturais pro tom da sua marca.",
  },
  {
    icon: "🔗",
    title: "Cliques rastreados",
    desc: "Cada link enviado é rastreável — veja de verdade quantos comentaram, quantos abriram a DM e quantos clicaram.",
  },
  {
    icon: "👥",
    title: "Várias contas, uma equipe",
    desc: "Se você gerencia Instagram de clientes, conecta quantas contas o plano permitir e convida colaboradores pra cada uma.",
  },
  {
    icon: "🛡️",
    title: "100% API oficial",
    desc: "Nada de gambiarra que arrisca banir a conta. Tudo roda em cima da API oficial de Login do Instagram.",
  },
];

export default async function Home() {
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      {/* nav */}
      <header className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[var(--ink)]">
          <SignalMark size={24} className="text-[var(--indigo)]" />
          <span className="font-display text-lg font-medium tracking-tight">Sinal</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[var(--ink-soft)] hover:text-[var(--ink)]">
            Entrar
          </Link>
          <Link href="/signup" className="btn btn-primary text-sm">
            Criar conta grátis
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="app-nav relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10">
          <p className="text-xs uppercase tracking-widest text-white/50 mb-4 mono">
            automação de instagram · api oficial
          </p>
          <h1 className="font-display text-4xl md:text-6xl font-medium text-white leading-[1.05] mb-6 max-w-3xl mx-auto">
            Toda palavra-chave vira uma conversa automática.
          </h1>
          <p className="text-white/60 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
            Comentário, resposta a story ou DM com a palavra certa — o Sinal
            responde na hora, sem depender de mensalidade de ferramenta
            terceira e sem gambiarra que arrisca sua conta.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/signup" className="btn btn-signal px-6 py-3">
              Começar grátis
            </Link>
            <Link href="#planos" className="btn btn-outline border-white/20 text-white px-6 py-3">
              Ver planos
            </Link>
          </div>
        </div>
        <div
          aria-hidden
          className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, var(--signal), transparent 70%)" }}
        />
      </section>

      {/* features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-[var(--ink)] text-center mb-2">
          Tudo que uma automação séria precisa
        </h2>
        <p className="text-[var(--ink-soft)] text-center mb-12">
          Sem depender de scraping, sem risco de banimento.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <span className="text-2xl">{f.icon}</span>
              <p className="font-medium text-[var(--ink)] mt-3 mb-1.5">{f.title}</p>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="planos" className="max-w-3xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-[var(--ink)] text-center mb-2">
          Planos simples, sem pegadinha
        </h2>
        <p className="text-[var(--ink-soft)] text-center mb-12">
          Comece grátis, mude de plano quando precisar de mais contas.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(plans ?? []).map((p) => (
            <div key={p.id} className="card p-6 flex flex-col">
              <p className="font-medium text-[var(--ink)] mb-1">{p.name}</p>
              <p className="font-display text-3xl text-[var(--ink)] mb-4">
                R$ {(p.price_cents / 100).toFixed(0)}
                <span className="text-sm text-[var(--ink-faint)] font-normal">/mês</span>
              </p>
              <ul className="text-sm text-[var(--ink-soft)] space-y-1.5 mb-6 flex-1">
                <li>✓ até {p.max_ig_accounts} conta(s) de Instagram</li>
                <li>
                  ✓{" "}
                  {p.max_messages_per_month
                    ? `${p.max_messages_per_month} mensagens/mês`
                    : "mensagens ilimitadas"}
                </li>
                {p.trial_days ? <li>✓ {p.trial_days} dias grátis</li> : null}
              </ul>
              <Link href="/signup" className="btn btn-outline w-full">
                Começar
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* cta final */}
      <section className="app-nav">
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <h2 className="font-display text-2xl md:text-3xl font-medium text-white mb-4">
            Pronto pra automatizar seu Instagram?
          </h2>
          <Link href="/signup" className="btn btn-signal px-6 py-3 inline-block">
            Criar conta grátis
          </Link>
        </div>
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-[var(--ink-faint)]">
        <span>© {new Date().getFullYear()} Sinal</span>
        <div className="flex gap-4">
          <Link href="/privacidade" className="hover:text-[var(--ink-soft)]">
            Privacidade
          </Link>
          <Link href="/exclusao-de-dados" className="hover:text-[var(--ink-soft)]">
            Exclusão de dados
          </Link>
        </div>
      </footer>
    </main>
  );
}
