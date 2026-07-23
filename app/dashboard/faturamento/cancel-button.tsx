"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (
      !confirm(
        "Remover o cartão e cancelar a assinatura? Seu plano volta pro grátis imediatamente."
      )
    )
      return;

    setLoading(true);
    const res = await fetch("/api/mercadopago/cancel-subscription", { method: "POST" });
    setLoading(false);

    if (res.ok) {
      router.push("/dashboard");
      router.refresh();
    } else {
      const json = await res.json();
      alert(json.error ?? "Erro ao cancelar.");
    }
  }

  return (
    <button onClick={handleCancel} disabled={loading} className="btn btn-outline text-[var(--coral)]">
      {loading ? "Cancelando..." : "Remover cartão e cancelar assinatura"}
    </button>
  );
}
