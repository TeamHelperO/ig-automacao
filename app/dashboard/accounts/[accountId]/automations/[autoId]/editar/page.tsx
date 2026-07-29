"use client";

import { useParams } from "next/navigation";
import FlowBuilder from "../../flow-builder";

export default function EditarAutomacaoPage() {
  const params = useParams<{ autoId: string }>();

  return (
    <div>
      <h1 className="font-display text-xl font-medium text-[var(--ink)] mb-1">
        Editar automação
      </h1>
      <p className="text-sm text-[var(--ink-faint)] mb-6">
        Clica em cada bloco pra configurar essa etapa.
      </p>
      <FlowBuilder automationId={params.autoId} />
    </div>
  );
}
