"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { AuthShell } from "@/components/auth-shell";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError("Email ou senha incorretos.");
      return;
    }
    router.push(params.get("next") || "/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="font-display text-2xl font-medium text-[var(--ink)] mb-1">Entrar</h2>
      <p className="text-sm text-[var(--ink-soft)] mb-7">Acesse seu painel de automação.</p>

      <label className="block mb-3">
        <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input"
          autoFocus
        />
      </label>
      <label className="block mb-4">
        <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">Senha</span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </label>

      {error && <p className="text-sm text-[var(--coral)] mb-4">{error}</p>}

      <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 mb-5">
        {loading ? "Entrando..." : "Entrar"}
      </button>

      <p className="text-xs text-[var(--ink-faint)] text-center">
        Não tem conta?{" "}
        <Link href="/signup" className="text-[var(--ink)] font-medium">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell eyebrow="acesso" title="Cada conta, uma conversa acontecendo agora.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
