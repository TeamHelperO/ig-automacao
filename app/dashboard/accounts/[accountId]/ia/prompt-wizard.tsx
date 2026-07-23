"use client";

import { useState } from "react";

type Answers = {
  brand: string;
  offer: string;
  persona: string;
  tone: string;
  canDo: string;
  cannotDo: string;
  fallback: string;
};

const STEPS: { key: keyof Answers; question: string; placeholder: string }[] = [
  {
    key: "brand",
    question: "Qual o nome da sua marca ou negócio?",
    placeholder: "Ex: Clínica Vetorial",
  },
  {
    key: "offer",
    question: "Em poucas frases, o que vocês oferecem?",
    placeholder: "Ex: Cursos preparatórios pra concursos públicos, com plataforma online e mentoria.",
  },
  {
    key: "persona",
    question: "Como o agente deve se apresentar? Que nome/papel ele tem?",
    placeholder: "Ex: Ana, atendente virtual da equipe",
  },
  {
    key: "tone",
    question: "Que tom de voz ele deve usar?",
    placeholder: "Ex: descontraído, usa emojis com moderação, trata todo mundo por 'você'",
  },
  {
    key: "canDo",
    question: "O que ele PODE fazer ou responder?",
    placeholder: "Ex: tirar dúvidas sobre preço, horário de atendimento, formas de pagamento, prazos",
  },
  {
    key: "cannotDo",
    question: "O que ele NUNCA deve fazer ou prometer?",
    placeholder: "Ex: não pode fechar vendas, não pode prometer desconto, não pode dar orientação médica/jurídica",
  },
  {
    key: "fallback",
    question: "Se ele não souber responder, o que deve fazer?",
    placeholder: "Ex: dizer que vai chamar alguém da equipe e não inventar uma resposta",
  },
];

function buildPrompt(a: Answers): string {
  const lines = [
    `Você é ${a.persona || "a atendente virtual"} da ${a.brand || "empresa"}.`,
    a.offer ? `O negócio: ${a.offer}` : "",
    a.tone ? `Tom de voz: ${a.tone}` : "",
    a.canDo ? `Você pode: ${a.canDo}` : "",
    a.cannotDo ? `Você NUNCA deve: ${a.cannotDo}` : "",
    a.fallback
      ? `Se não souber a resposta: ${a.fallback}`
      : "Se não souber a resposta com certeza, seja honesto e não invente informação.",
    "Responda sempre em português do Brasil, de forma breve e natural, como numa conversa de DM do Instagram.",
  ];
  return lines.filter(Boolean).join("\n\n");
}

export default function PromptWizard({
  onGenerate,
  onClose,
}: {
  onGenerate: (prompt: string) => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({
    brand: "",
    offer: "",
    persona: "",
    tone: "",
    canDo: "",
    cannotDo: "",
    fallback: "",
  });

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function update(value: string) {
    setAnswers((a) => ({ ...a, [current.key]: value }));
  }

  function next() {
    if (isLast) {
      onGenerate(buildPrompt(answers));
    } else {
      setStep((s) => s + 1);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div
        className="bg-[var(--surface)] rounded-xl p-6 w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-[var(--ink-faint)] mono">
            pergunta {step + 1} de {STEPS.length}
          </p>
          <button onClick={onClose} className="text-[var(--ink-faint)]">
            ✕
          </button>
        </div>

        <div className="w-full h-1 bg-[var(--paper)] rounded-full mb-5 overflow-hidden">
          <div
            className="h-full bg-[var(--signal)] transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <p className="font-medium text-[var(--ink)] mb-3">{current.question}</p>
        <textarea
          autoFocus
          value={answers[current.key]}
          onChange={(e) => update(e.target.value)}
          className="input mb-5"
          rows={4}
          placeholder={current.placeholder}
        />

        <div className="flex items-center justify-between">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="btn-ghost text-sm disabled:opacity-30"
          >
            Voltar
          </button>
          <button onClick={next} className="btn btn-primary">
            {isLast ? "Criar prompt" : "Próxima"}
          </button>
        </div>
      </div>
    </div>
  );
}
