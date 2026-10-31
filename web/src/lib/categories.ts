// As mesmas categorias da versão 1 (northfinance/categories.py).
// No banco elas continuam com o emoji na frente ("🛒 Mercado"); na tela mostramos
// só o nome, com um ícone desenhado no lugar do emoji.

export const EXPENSE_CATEGORIES = ["🛒 Mercado", "🎮 Lazer", "💡 Contas", "🍔 Comida fora", "⛽ Gasolina", "📦 Outros"];
export const INCOME_CATEGORIES = ["💼 Salário", "💸 Pix recebido", "🧾 Extra", "📦 Outros"];

// Cor fixa para cada categoria, pelo nome. "Outros" e desconhecidas ficam cinza.
const COLORS: Record<string, string> = {
  Mercado: "#3b82f6",
  Lazer: "#f97316",
  Contas: "#10b981",
  "Comida fora": "#eab308",
  Gasolina: "#ec4899",
  Salário: "#22c55e",
  "Pix recebido": "#14b8a6",
  Extra: "#8b5cf6",
};
const OTHER = "#94a3b8";

/** "🛒 Mercado" vira "Mercado". */
export function categoryName(category: string): string {
  const space = category.indexOf(" ");
  return space > 0 && !/[\p{L}\p{N}]/u.test(category.slice(0, space)) ? category.slice(space + 1) : category;
}

export function categoryColor(category: string): string {
  return COLORS[categoryName(category)] ?? OTHER;
}
