// As mesmas categorias da versão 1 (northfinance/categories.py).
// No banco elas continuam com o emoji na frente ("🛒 Mercado"); na tela mostramos
// só o nome, com um ícone desenhado no lugar do emoji.

// As novas seguem o mesmo formato (emoji + nome) para continuar compatível com a versão 1.
export const EXPENSE_CATEGORIES = [
  "🛒 Mercado", "🍔 Comida fora", "🚌 Transporte", "⛽ Gasolina", "🏠 Casa", "💡 Contas", "💊 Saúde",
  "🎓 Educação", "🎮 Lazer", "📺 Assinaturas", "🛍️ Compras", "🐾 Pets", "📦 Outros",
];
// As 5 que aparecem primeiro no Anotar para quem ainda não tem histórico
export const DEFAULT_FAVORITES = ["🛒 Mercado", "🍔 Comida fora", "🚌 Transporte", "💡 Contas", "🎮 Lazer"];

/** As 5 categorias de gasto que aparecem primeiro: as mais usadas, completando com as mais comuns. */
export function favoriteExpenseCategories(mostUsed: string[]): string[] {
  const list = mostUsed.filter((c) => EXPENSE_CATEGORIES.includes(c));
  for (const c of DEFAULT_FAVORITES) if (list.length < 5 && !list.includes(c)) list.push(c);
  return list.slice(0, 5);
}

export const INCOME_CATEGORIES = ["💼 Salário", "💸 Pix recebido", "🧾 Extra", "🏷️ Vendas", "📦 Outros"];

// Cor fixa para cada categoria, pelo nome. "Outros" e desconhecidas ficam cinza.
const COLORS: Record<string, string> = {
  Mercado: "#3b82f6",
  Lazer: "#f97316",
  Contas: "#10b981",
  "Comida fora": "#eab308",
  Gasolina: "#ec4899",
  Transporte: "#06b6d4",
  Casa: "#6366f1",
  Saúde: "#f43f5e",
  Educação: "#a855f7",
  Assinaturas: "#84cc16",
  Compras: "#d946ef",
  Pets: "#b45309",
  Vendas: "#0ea5e9",
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
