"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase-browser";

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

    // Se a confirmação por email estiver desativada no projeto,
    // já vem uma sessão pronta e dá pra ir direto pro painel.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
        <div className="bg-white shadow-sm border border-neutral-200 rounded-xl p-8 w-full max-w-sm text-center">
          <h1 className="text-lg font-semibold text-neutral-900 mb-2">
            Confirme seu email
          </h1>
          <p className="text-sm text-neutral-500">
            Mandamos um link de confirmação pra {email}. Depois de confirmar,
            é só entrar normalmente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-sm border border-neutral-200 rounded-xl p-8 w-full max-w-sm"
      >
        <h1 className="text-lg font-semibold text-neutral-900 mb-1">
          Criar conta
        </h1>
        <p className="text-sm text-neutral-500 mb-6">
          Comece grátis, com 1 conta de Instagram.
        </p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-900"
          autoFocus
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha (mínimo 6 caracteres)"
          minLength={6}
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        />
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Criando..." : "Criar conta"}
        </button>
        <p className="text-xs text-neutral-500 mt-4 text-center">
          Já tem conta?{" "}
          <Link href="/login" className="text-neutral-900 font-medium">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
