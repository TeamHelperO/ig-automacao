export type FeatureKey =
  | "team"
  | "ai_agent"
  | "ai_replies"
  | "content_publish"
  | "insights";

export const FEATURE_CATALOG: {
  key: FeatureKey;
  label: string;
  hasLimit: boolean;
  limitLabel?: string;
}[] = [
  { key: "team", label: "Equipe / colaboradores", hasLimit: true, limitLabel: "colaboradores por conta" },
  { key: "ai_agent", label: "Agente de IA (atendimento com base de conhecimento)", hasLimit: false },
  { key: "ai_replies", label: "Respostas com IA nas automações", hasLimit: false },
  { key: "content_publish", label: "Postagem automática com IA", hasLimit: true, limitLabel: "posts por mês" },
  { key: "insights", label: "Insights / analytics do perfil", hasLimit: false },
];
