// "Sobrou dinheiro?": decide se a linha aparece no Início e calcula os números da janela.
// Regra: aparece 3 dias antes do salário e fica até o salário ser anotado (no máximo 7 dias depois).
// Sem dia do salário (nem salvo, nem descoberto), usa os últimos 5 dias do mês.
import * as db from "@/lib/db";
import { shiftMonth } from "@/lib/money";
import { currentCycle, daysBetween, detectRule, ruleLabel, type PaydayKind, type PaydayRule } from "@/lib/payday";

const DAY = 86_400_000;
const KINDS: PaydayKind[] = ["fixed", "fifth_business", "last_business"];

export type Savings = {
  visible: boolean;
  amountCents: number;
  averageExpenseCents: number | null;
  rule: PaydayRule | null;
  ruleSource: "saved" | "detected" | "none";
  ruleText: string | null; // "no último dia útil"
};

/** A regra do salário: a escolhida pela pessoa ou a descoberta pelos salários anotados. */
export async function paydayRuleFor(email: string, today: Date): Promise<{ rule: PaydayRule | null; source: "saved" | "detected" | "none" }> {
  const saved = await db.getPaydayRule(email);
  const savedRule = saved && KINDS.includes(saved.kind as PaydayKind) ? (saved as PaydayRule) : null;
  const rule = savedRule ?? detectRule(await db.salaryDays(email, shiftMonth(today, -4)));
  return { rule, source: savedRule ? "saved" : rule ? "detected" : "none" };
}

export async function savingsFor(email: string, today: Date): Promise<Savings> {
  const { rule, source: ruleSource } = await paydayRuleFor(email, today);
  const tomorrow = new Date(today.getTime() + DAY);

  let visible: boolean;
  let amountCents: number;
  if (rule) {
    const { payday, previous } = currentCycle(today, rule);
    const opens = new Date(payday.getTime() - 3 * DAY);
    const inWindow = today >= opens && daysBetween(payday, today) <= 7;
    visible = inWindow && !(await db.salaryRecordedSince(email, opens));
    // O ciclo começa um pouco antes do salário anterior (às vezes ele é anotado um ou dois dias antes)
    const cycleStart = new Date(previous.getTime() - 3 * DAY);
    const [totals, saved] = await Promise.all([db.monthTotals(email, cycleStart, tomorrow), db.savedBetween(email, cycleStart, tomorrow)]);
    amountCents = totals.income - totals.expense - saved;
  } else {
    const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
    visible = today.getUTCDate() > lastDay - 5;
    const [totals, saved] = await Promise.all([db.monthTotals(email, shiftMonth(today, 0), tomorrow), db.savedBetween(email, shiftMonth(today, 0), tomorrow)]);
    amountCents = totals.income - totals.expense - saved;
  }

  return {
    visible: visible && amountCents > 0,
    amountCents,
    averageExpenseCents: await db.averageMonthlyExpense(email, shiftMonth(today, -3), shiftMonth(today, 0)),
    rule,
    ruleSource,
    ruleText: rule ? ruleLabel(rule) : null,
  };
}
