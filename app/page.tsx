import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { supabaseAdmin } from "@/lib/supabase";
import { getSystemSettings } from "@/lib/settings";

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
    title: "Agente de IA próprio",
    desc: "Uma base de conhecimento sua alimenta um agente que conversa de verdade quando o assunto sai do roteiro das automações.",
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

const STEPS = [
  { n: "01", title: "Alguém comenta", desc: '"Eu quero" no seu post, reels ou story.' },
  { n: "02", title: "A automação dispara", desc: "Resposta pública opcional + DM privada na hora." },
  { n: "03", title: "A conversa continua", desc: "Link, lembrete ou a IA assume — do seu jeito." },
];

function PhoneMockup({ accent }: { accent: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[300px]">
      <div className="rounded-[2rem] border border-white/10 bg-[var(--indigo-soft)] p-3 shadow-2xl">
        <div className="rounded-[1.5rem] bg-[var(--paper)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[var(--border-strong)]" />
            <div className="h-2 w-20 rounded-full bg-[var(--border-strong)]" />
          </div>
          <div className="p-4 space-y-2.5 min-h-[280px]">
            <div className="flex justify-start">
              <div className="bg-white border border-[var(--border)] rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-[var(--ink)] max-w-[75%]">
                Eu quero! 🙋
              </div>
            </div>
            <div className="flex justify-end">
              <div
                className="rounded-2xl rounded-br-sm px-3.5 py-2 text-xs text-white max-w-[80%]"
                style={{ background: accent }}
              >
                Oi! Toque no botão abaixo pra continuar 👇
              </div>
            </div>
            <div className="flex justify-end">
              <div className="border border-white/30 rounded-full px-3 py-1.5 text-[11px] text-white/90 self-end" style={{ background: "rgba(255,255,255,0.08)" }}>
                Quero o link
              </div>
            </div>
            <div className="flex justify-start pt-1">
              <div className="bg-white border border-[var(--border)] rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-[var(--ink)] max-w-[75%] flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[var(--ink-faint)] animate-bounce" />
                <span className="w-1 h-1 rounded-full bg-[var(--ink-faint)] animate-bounce [animation-delay:0.15s]" />
                <span className="w-1 h-1 rounded-full bg-[var(--ink-faint)] animate-bounce [animation-delay:0.3s]" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="absolute -z-10 -inset-6 rounded-[3rem] opacity-30 blur-2xl"
        style={{ background: `radial-gradient(circle, ${accent}, transparent 70%)` }}
      />
    </div>
  );
}

export default async function Home() {
  const settings = await getSystemSettings();
  const { data: plans } = await supabaseAdmin
    .from("plans")
    .select("*")
    .eq("active", true)
    .order("price_cents", { ascending: true });

  return (
    <main className="min-h-screen bg-[var(--paper)]">
      {/* nav */}
      <header className="max-w-6xl mx-auto px-6 py-7 flex items-center justify-between">
        <div className="flex items-center gap-2.5 text-[var(--ink)]">
          <BrandMark logoUrl={settings.logo_url} size={36} className="text-[var(--indigo)]" />
          <span className="font-display text-2xl font-medium tracking-tight">{settings.app_name}</span>
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
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 relative z-10 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/50 mb-5 mono">
              automação de instagram · api oficial
            </p>
            <h1 className="font-display text-4xl md:text-5xl lg:text-[3.4rem] font-medium text-white leading-[1.05] mb-6">
              Toda palavra-chave vira uma conversa automática.
            </h1>
            <p className="text-white/60 text-lg max-w-lg mb-10 leading-relaxed">
              Comentário, resposta a story ou DM com a palavra certa — o {settings.app_name}{" "}
              responde na hora, sem depender de mensalidade de ferramenta terceira e sem
              gambiarra que arrisca sua conta.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/signup" className="btn btn-signal px-6 py-3">
                Começar grátis
              </Link>
              <Link href="#planos" className="btn btn-outline border-white/20 text-white px-6 py-3">
                Ver planos
              </Link>
            </div>
          </div>
          <PhoneMockup accent={settings.accent_color} />
        </div>
        <div
          aria-hidden
          className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, var(--signal), transparent 70%)" }}
        />
      </section>

      {/* como funciona */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-4">
          {STEPS.map((s, i) => (
            <div key={s.n} className="relative">
              <div className="card p-6">
                <p className="font-display text-3xl text-[var(--coral)] mb-3">{s.n}</p>
                <p className="font-medium text-[var(--ink)] mb-1.5">{s.title}</p>
                <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && (
                <span className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 text-[var(--ink-faint)] text-lg">
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-[var(--ink)] text-center mb-2">
          Tudo que uma automação séria precisa
        </h2>
        <p className="text-[var(--ink-soft)] text-center mb-12">
          Sem depender de scraping, sem risco de banimento.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card card-interactive p-6">
              <div className="w-10 h-10 rounded-full bg-[var(--signal-soft)] flex items-center justify-center text-lg mb-3.5">
                {f.icon}
              </div>
              <p className="font-medium text-[var(--ink)] mb-1.5">{f.title}</p>
              <p className="text-sm text-[var(--ink-soft)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section id="planos" className="max-w-4xl mx-auto px-6 py-20">
        <h2 className="font-display text-2xl md:text-3xl font-medium text-[var(--ink)] text-center mb-2">
          Planos simples, sem pegadinha
        </h2>
        <p className="text-[var(--ink-soft)] text-center mb-12">
          Comece grátis, mude de plano quando precisar de mais contas.
        </p>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
          {(plans ?? []).map((p) => (
            <div key={p.id} className="card card-interactive p-6 flex flex-col">
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
      <section className="app-nav relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-6 py-20 text-center relative z-10">
          <h2 className="font-display text-2xl md:text-3xl font-medium text-white mb-4">
            Pronto pra automatizar seu Instagram?
          </h2>
          <Link href="/signup" className="btn btn-signal px-6 py-3 inline-block">
            Criar conta grátis
          </Link>
        </div>
        <div
          aria-hidden
          className="absolute -left-24 -top-24 w-72 h-72 rounded-full opacity-[0.08]"
          style={{ background: "radial-gradient(circle, var(--signal), transparent 70%)" }}
        />
      </section>

      <footer className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between text-xs text-[var(--ink-faint)]">
        <span className="flex items-center gap-1.5">
          <BrandMark logoUrl={settings.logo_url} size={16} />© {new Date().getFullYear()}{" "}
          {settings.app_name}
        </span>
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
