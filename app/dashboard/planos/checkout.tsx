"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";

let initialized = false;

export default function Checkout({
  planId,
  priceCents,
}: {
  planId: string;
  priceCents: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    if (key && !initialized) {
      initMercadoPago(key, { locale: "pt-BR" });
      initialized = true;
    }
    setReady(Boolean(key));
  }, []);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-primary">
        Assinar
      </button>
    );
  }

  if (!ready) {
    return (
      <p className="text-xs text-[var(--coral)]">
        Checkout não configurado (falta a chave pública do Mercado Pago).
      </p>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <p className="text-xs text-[var(--ink-faint)] mb-2">
        Cobrança recorrente mensal — cancele quando quiser em Faturamento.
      </p>
      <CardPayment
        initialization={{ amount: priceCents / 100 }}
        customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 1 } }}
        onSubmit={async (formData) => {
          setMessage("Ativando assinatura...");
          try {
            const res = await fetch("/api/mercadopago/create-subscription", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                token: formData.token,
                payer: formData.payer,
                plan_id: planId,
              }),
            });
            const json = await res.json();

            if (json.status === "authorized") {
              setMessage("Assinatura ativada! Atualizando seu plano...");
              router.refresh();
            } else if (json.status === "pending") {
              setMessage("Assinatura em análise. Assim que aprovar, seu plano muda automaticamente.");
            } else {
              setMessage(json.error ?? "Não deu pra ativar. Tenta outro cartão.");
            }
          } catch {
            setMessage("Erro ao processar. Tenta de novo.");
          }
        }}
        onError={() => setMessage("Erro ao carregar o checkout.")}
      />
      {message && <p className="text-xs text-[var(--ink-soft)] mt-2">{message}</p>}
      <button
        onClick={() => setOpen(false)}
        className="text-xs text-[var(--ink-faint)] mt-3"
      >
        Cancelar
      </button>
    </div>
  );
}
