// Ícone desenhado de cada categoria, dentro de um círculo com a cor dela
import {
  ArrowDownLeft,
  Briefcase,
  Fuel,
  Gamepad2,
  Lightbulb,
  Package,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

import { categoryColor, categoryName } from "@/lib/categories";

const ICONS: Record<string, LucideIcon> = {
  Mercado: ShoppingCart,
  Lazer: Gamepad2,
  Contas: Lightbulb,
  "Comida fora": UtensilsCrossed,
  Gasolina: Fuel,
  Salário: Briefcase,
  "Pix recebido": ArrowDownLeft,
  Extra: Sparkles,
};

export function CategoryIcon({ category, size = 44 }: { category: string; size?: number }) {
  const Icon = ICONS[categoryName(category)] ?? Package;
  const color = categoryColor(category);
  return (
    <span
      className="flex flex-none items-center justify-center rounded-full"
      style={{ width: size, height: size, background: `${color}26`, color }}
    >
      <Icon size={size * 0.45} strokeWidth={2.2} />
    </span>
  );
}

/** Versão pequena, sem círculo, para dentro das pílulas do Anotar */
export function CategoryGlyph({ category }: { category: string }) {
  const Icon = ICONS[categoryName(category)] ?? Package;
  return <Icon size={16} strokeWidth={2.2} style={{ color: categoryColor(category) }} />;
}
