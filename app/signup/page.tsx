"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { AuthShell } from "@/components/auth-shell";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  return (
    <AuthShell eyebrow="cadastro" title="Comece grátis com 1 conta de Instagram.">
      {done ? (
        <div>
          <h2 className="font-display text-2xl font-medium text-[var(--ink)] mb-2">
            Confirme seu email
          </h2>
          <p className="text-sm text-[var(--ink-soft)]">
            Mandamos um link de confirmação pra <strong>{email}</strong>. Depois
            de confirmar, é só entrar normalmente.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <h2 className="font-display text-2xl font-medium text-[var(--ink)] mb-1">
            Criar conta
          </h2>
          <p className="text-sm text-[var(--ink-soft)] mb-7">
            Sem cartão de crédito pra começar.
          </p>

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
            <span className="block text-xs font-medium text-[var(--ink-soft)] mb-1.5">
              Senha (mínimo 6 caracteres)
            </span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>

          {error && <p className="text-sm text-[var(--coral)] mb-4">{error}</p>}

          <button type="submit" disabled={loading} className="btn btn-primary w-full py-2.5 mb-5">
            {loading ? "Criando..." : "Criar conta"}
          </button>

          <p className="text-xs text-[var(--ink-faint)] text-center">
            Já tem conta?{" "}
            <Link href="/login" className="text-[var(--ink)] font-medium">
              Entrar
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
