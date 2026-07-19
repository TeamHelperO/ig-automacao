"use client";

import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ContaPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingEmail(true);
    setEmailMsg("");

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ email });

    setSavingEmail(false);
    setEmailMsg(
      error
        ? `Erro: ${error.message}`
        : "Enviamos um link de confirmação pro novo email. Ele só troca depois que você confirmar."
    );
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordMsg("");

    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.updateUser({ password });

    setSavingPassword(false);
    setPasswordMsg(error ? `Erro: ${error.message}` : "Senha atualizada.");
    if (!error) setPassword("");
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10">
      <Link href="/dashboard" className="text-sm text-[var(--ink-faint)]">
        ← Painel
      </Link>
      <h1 className="font-display text-2xl font-medium text-[var(--ink)] mt-3 mb-8">
        Minha conta
      </h1>

      <form onSubmit={handleEmailSubmit} className="card p-5 mb-4">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">Trocar email</p>
        <input
          type="email"
          required
          placeholder="Novo email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input mb-3"
        />
        {emailMsg && <p className="text-xs text-[var(--ink-soft)] mb-3">{emailMsg}</p>}
        <button type="submit" disabled={savingEmail} className="btn btn-primary">
          {savingEmail ? "Salvando..." : "Salvar email"}
        </button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="card p-5">
        <p className="text-sm font-medium text-[var(--ink)] mb-3">Trocar senha</p>
        <input
          type="password"
          required
          minLength={6}
          placeholder="Nova senha (mínimo 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input mb-3"
        />
        {passwordMsg && <p className="text-xs text-[var(--ink-soft)] mb-3">{passwordMsg}</p>}
        <button type="submit" disabled={savingPassword} className="btn btn-primary">
          {savingPassword ? "Salvando..." : "Salvar senha"}
        </button>
      </form>
    </main>
  );
}
