// Dia do salário: dia fixo, 5º dia útil ou último dia útil.
// Dia útil = segunda a sexta, sem os feriados nacionais (os municipais o app não conhece).
// Todas as datas são "dia sem hora", em UTC, como no resto do app.

export type PaydayKind = "fixed" | "fifth_business" | "last_business";
export type PaydayRule = { kind: PaydayKind; day: number | null };

const DAY = 86_400_000;
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m, d));
const key = (d: Date) => d.toISOString().slice(0, 10);

/** Domingo de Páscoa (algoritmo de Meeus/Jones/Butcher). Carnaval, Sexta-feira Santa e Corpus Christi dependem dela. */
function easter(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

const holidayCache = new Map<number, Set<string>>();

/** Feriados nacionais (e os dias em que os bancos não abrem: Carnaval e Corpus Christi). */
export function holidays(year: number): Set<string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const fixed = ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"];
  const set = new Set(fixed.map((md) => `${year}-${md}`));
  const e = easter(year).getTime();
  for (const offset of [-48, -47, -2, 60]) set.add(key(new Date(e + offset * DAY)));
  holidayCache.set(year, set);
  return set;
}

export function isBusinessDay(day: Date): boolean {
  const weekday = day.getUTCDay();
  return weekday !== 0 && weekday !== 6 && !holidays(day.getUTCFullYear()).has(key(day));
}

/** Data do salário dentro de um mês, conforme a regra. */
export function paydayIn(month: Date, rule: PaydayRule): Date {
  const y = month.getUTCFullYear(), m = month.getUTCMonth();
  const lastDay = utc(y, m + 1, 0).getUTCDate();
  if (rule.kind === "fixed") return utc(y, m, Math.min(rule.day ?? 1, lastDay));
  if (rule.kind === "last_business") {
    let d = lastDay;
    while (!isBusinessDay(utc(y, m, d))) d--;
    return utc(y, m, d);
  }
  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    if (isBusinessDay(utc(y, m, d)) && ++count === 5) return utc(y, m, d);
  }
  return utc(y, m, lastDay);
}

/**
 * Descobre a regra pelas datas dos salários já anotados (um por mês, o maior).
 * Testa último dia útil, 5º dia útil e dia fixo; vale a que bater com a maioria. Precisa de 2 meses.
 */
export function detectRule(salaryDays: Date[]): PaydayRule | null {
  if (salaryDays.length < 2) return null;
  const monthOf = (d: Date) => utc(d.getUTCFullYear(), d.getUTCMonth(), 1);
  const fits = (rule: PaydayRule) =>
    salaryDays.filter((d) => paydayIn(monthOf(d), rule).getTime() === d.getTime()).length;
  const enough = (n: number) => n >= Math.max(2, Math.ceil(salaryDays.length * 0.66));

  for (const rule of [{ kind: "last_business", day: null }, { kind: "fifth_business", day: null }] as PaydayRule[]) {
    if (enough(fits(rule))) return rule;
  }
  // Dia fixo: o dia do mês que mais se repete
  const counts = new Map<number, number>();
  for (const d of salaryDays) counts.set(d.getUTCDate(), (counts.get(d.getUTCDate()) ?? 0) + 1);
  const [day, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return enough(n) ? { kind: "fixed", day } : null;
}

/** "último dia útil", "5º dia útil" ou "dia 10" */
export function ruleLabel(rule: PaydayRule): string {
  if (rule.kind === "last_business") return "no último dia útil";
  if (rule.kind === "fifth_business") return "no 5º dia útil";
  return `no dia ${rule.day}`;
}

/**
 * O próximo salário que importa agora: o primeiro cuja janela (3 dias antes até 7 dias depois)
 * ainda não acabou. Devolve também o salário anterior, que é onde o ciclo atual começou.
 */
export function currentCycle(today: Date, rule: PaydayRule): { payday: Date; previous: Date } {
  for (let offset = -1; offset <= 1; offset++) {
    const month = utc(today.getUTCFullYear(), today.getUTCMonth() + offset, 1);
    const payday = paydayIn(month, rule);
    if (payday.getTime() + 7 * DAY >= today.getTime()) {
      const previous = paydayIn(utc(month.getUTCFullYear(), month.getUTCMonth() - 1, 1), rule);
      return { payday, previous };
    }
  }
  const month = utc(today.getUTCFullYear(), today.getUTCMonth() + 1, 1);
  return { payday: paydayIn(month, rule), previous: paydayIn(utc(today.getUTCFullYear(), today.getUTCMonth(), 1), rule) };
}

export const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);
