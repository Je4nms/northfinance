// As mesmas categorias da versão 1 (northfinance/categories.py)

export const EXPENSE_CATEGORIES = ["🛒 Mercado", "🎮 Lazer", "💡 Contas", "🍔 Comida fora", "⛽ Gasolina", "📦 Outros"];
export const INCOME_CATEGORIES = ["💼 Salário", "💸 Pix recebido", "🧾 Extra", "📦 Outros"];

// Cor fixa para cada categoria de gasto, na ordem da lista. "Outros" e desconhecidas ficam cinza.
const COLORS = ["#3b82f6", "#f97316", "#10b981", "#eab308", "#ec4899"];
const OTHER = "#94a3b8";

export function categoryColor(category: string): string {
  const index = EXPENSE_CATEGORIES.indexOf(category);
  return index >= 0 && index < COLORS.length ? COLORS[index] : OTHER;
}

/** "🛒 Mercado" vira ["🛒", "Mercado"]. */
export function splitCategory(category: string): [string, string] {
  const space = category.indexOf(" ");
  return space > 0 ? [category.slice(0, space), category.slice(space + 1)] : ["📦", category];
}
