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
      <CardPayment
        initialization={{ amount: priceCents / 100 }}
        customization={{ paymentMethods: { minInstallments: 1, maxInstallments: 3 } }}
        onSubmit={async (formData) => {
          setMessage("Processando pagamento...");
          try {
            const res = await fetch("/api/mercadopago/create-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...formData, plan_id: planId }),
            });
            const json = await res.json();

            if (json.status === "approved") {
              setMessage("Pagamento aprovado! Atualizando seu plano...");
              router.refresh();
            } else if (json.status === "pending") {
              setMessage("Pagamento em análise. Assim que aprovar, seu plano muda automaticamente.");
            } else {
              setMessage("Pagamento recusado. Tenta outro cartão.");
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
