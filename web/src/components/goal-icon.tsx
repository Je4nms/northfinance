// Ícone desenhado de cada meta, dentro de um círculo com a cor dela
import { Car, Flag, GraduationCap, House, LifeBuoy, Plane, Smartphone, type LucideIcon } from "lucide-react";

import { GOAL_ICONS, isGoalIcon } from "@/lib/goals";

const ICONS: Record<string, LucideIcon> = {
  reserva: LifeBuoy, casa: House, carro: Car, celular: Smartphone, viagem: Plane, estudos: GraduationCap, outro: Flag,
};

export const goalColor = (icon: string) => (isGoalIcon(icon) ? GOAL_ICONS[icon].color : GOAL_ICONS.outro.color);

export function GoalIcon({ icon, size = 44 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon] ?? Flag;
  const color = goalColor(icon);
  return (
    <span className="flex flex-none items-center justify-center rounded-full" style={{ width: size, height: size, background: `${color}26`, color }}>
      <Icon size={size * 0.45} strokeWidth={2.2} />
    </span>
  );
}

/** Versão pequena, sem círculo, para dentro das pílulas */
export function GoalGlyph({ icon, size = 16 }: { icon: string; size?: number }) {
  const Icon = ICONS[icon] ?? Flag;
  return <Icon size={size} strokeWidth={2.2} style={{ color: goalColor(icon) }} />;
}
