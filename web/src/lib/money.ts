// Dinheiro e datas do jeito brasileiro (as mesmas regras do money.py da versão 1)

/** 1234567 vira "R$ 12.345,67". */
export function toBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Primeiro dia do mês e primeiro dia do mês seguinte, no fuso de São Paulo. */
export function monthRange(today: Date): [Date, Date] {
  const [year, month] = today.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }).split("-").map(Number);
  return [new Date(Date.UTC(year, month - 1, 1)), new Date(Date.UTC(year, month, 1))];
}

export function monthName(day: Date): string {
  const name = day.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}
