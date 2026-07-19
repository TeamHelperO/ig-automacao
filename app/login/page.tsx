"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push(params.get("next") || "/dashboard");
    } else {
      setError("Senha incorreta.");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white shadow-sm border border-neutral-200 rounded-xl p-8 w-full max-w-sm"
    >
      <h1 className="text-lg font-semibold text-neutral-900 mb-1">
        Painel de automação
      </h1>
      <p className="text-sm text-neutral-500 mb-6">
        Digite a senha para entrar.
      </p>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-neutral-900"
        autoFocus
      />
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-neutral-900 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
