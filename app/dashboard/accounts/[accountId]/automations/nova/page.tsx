import FlowBuilder from "../flow-builder";

export default function NovaAutomacaoPage() {
  return (
    <div>
      <h1 className="font-display text-xl font-medium text-[var(--ink)] mb-1">
        Nova automação
      </h1>
      <p className="text-sm text-[var(--ink-faint)] mb-6">
        Clica em cada bloco pra configurar essa etapa.
      </p>
      <FlowBuilder />
    </div>
  );
}
