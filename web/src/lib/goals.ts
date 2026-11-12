// Ícones das metas: o nome guardado no banco e a cor. O desenho de cada um fica em components/goal-icon.tsx.
export const GOAL_ICONS = {
  reserva: { label: "Reserva", color: "#10b981" },
  casa: { label: "Casa", color: "#6366f1" },
  carro: { label: "Carro", color: "#06b6d4" },
  celular: { label: "Celular", color: "#d946ef" },
  viagem: { label: "Viagem", color: "#f97316" },
  estudos: { label: "Estudos", color: "#a855f7" },
  outro: { label: "Outro", color: "#eab308" },
} as const;

export type GoalIconName = keyof typeof GOAL_ICONS;

export const isGoalIcon = (v: string): v is GoalIconName => v in GOAL_ICONS;
