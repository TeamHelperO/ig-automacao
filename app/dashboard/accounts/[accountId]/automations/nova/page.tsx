import FlowBuilder from "../flow-builder";

export default function NovaAutomacaoPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="font-display text-xl font-medium text-[var(--ink)] mb-1">
        Nova automação
      </h1>
      <p className="text-sm text-[var(--ink-faint)] mb-6">
        Clica em cada bloco pra configurar essa etapa.
      </p>
      <FlowBuilder />
    </main>
  );
}
