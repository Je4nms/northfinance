// Dinheiro e datas do jeito brasileiro (as mesmas regras do money.py da versão 1).
// As datas dos lançamentos não têm hora, então trabalhamos sempre em UTC para o dia não "pular".

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** 1234567 vira "R$ 12.345,67". */
export function toBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "12,50" ou "12.50" vira 1250. */
export function parseBRL(text: string): number {
  const clean = text.replace(/[^\d,.-]/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  return Math.round(Number(normalized) * 100);
}

/** Hoje em São Paulo, como data sem hora (meia-noite UTC). */
export function todayInSaoPaulo(now = new Date()): Date {
  return new Date(now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }) + "T00:00:00Z");
}

/** "2026-10-28" */
export function isoDate(day: Date): string {
  return day.toISOString().slice(0, 10);
}

/** Primeiro dia do mês, andando `months` meses (negativo = para trás). */
export function shiftMonth(day: Date, months: number): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + months, 1));
}

/** Primeiro dia do mês e primeiro dia do mês seguinte. */
export function monthRange(day: Date): [Date, Date] {
  return [shiftMonth(day, 0), shiftMonth(day, 1)];
}

/** "Outubro de 2026" */
export function monthName(day: Date): string {
  const name = MONTHS[day.getUTCMonth()];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${day.getUTCFullYear()}`;
}

/** "2026-10" vira o primeiro dia de outubro de 2026. Valor inválido ou no futuro vira o mês atual. */
export function parseMonth(value: string | undefined, today: Date): Date {
  const current = shiftMonth(today, 0);
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!match) return current;
  const month = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return month > current ? current : month;
}

export function monthParam(day: Date): string {
  return isoDate(day).slice(0, 7);
}

/** Rótulo do dia no extrato: "Hoje", "Ontem" ou "25 de outubro". */
export function dayLabel(day: Date, today: Date): string {
  const diff = Math.round((today.getTime() - day.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return `${day.getUTCDate()} de ${MONTHS[day.getUTCMonth()]}`;
}

/** Saudação conforme a hora do dia em São Paulo. */
export function greeting(now = new Date()): string {
  const hour = Number(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo", hour: "numeric", hour12: false }));
  if (hour >= 5 && hour < 12) return "Bom dia";
  if (hour >= 12 && hour < 18) return "Boa tarde";
  return "Boa noite";
}
