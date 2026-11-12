// Notificações: qual aviso cada pessoa recebe hoje (no máximo um por dia).
// A decisão (`pickNotification`) não acessa o banco: recebe os dados prontos, então dá para testar com qualquer data.
import * as db from "@/lib/db";
import { shiftMonth } from "@/lib/money";
import { currentCycle } from "@/lib/payday";
import { paydayRuleFor } from "@/lib/savings";

const DAY = 86_400_000;
const MONTHS = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

export type Notification = { kind: "bills" | "payday" | "monthly" | "newYear" | "weekly" | "inactive"; title: string; body: string; url: string };

export type DayContext = {
  today: Date;
  lastSent: string | null; // "2026-11-12"
  bills: { name: string; amountCents: number; nextDue: Date }[];
  payday: Date | null; // próximo salário (ou null se o app não sabe)
  lastEntry: string | null; // dia do último lançamento anotado
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY);

/** Escolhe o aviso de hoje, na ordem de importância. Nunca mostra valores (a tela de bloqueio pode ser vista por outros). */
export function pickNotification(c: DayContext): Notification | null {
  const { today } = c;
  if (c.lastSent === iso(today)) return null;

  // 1. Contas que vencem hoje ou daqui a 3 dias
  {
    const due = c.bills.filter((b) => [0, 3].includes(daysBetween(today, b.nextDue))).sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
    if (due.length) {
      const first = due[0];
      const when = daysBetween(today, first.nextDue) === 0 ? "vence hoje" : "vence em 3 dias";
      const more = due.length > 1 ? ` (e mais ${due.length - 1})` : "";
      return {
        kind: "bills",
        title: "Conta a vencer",
        body: `${first.name} ${when}${more}. Toque para marcar como paga.`,
        url: "/",
      };
    }
  }

  // 2. Três dias antes do salário
  if (c.payday && daysBetween(today, c.payday) === 3) {
    return { kind: "payday", title: "Seu salário está chegando", body: "Que tal guardar uma parte para as suas metas?", url: "/metas" };
  }

  // 3. Dia 1: o mês passado fechou
  if (today.getUTCDate() === 1) {
    const last = shiftMonth(today, -1);
    const name = MONTHS[last.getUTCMonth()];
    return {
      kind: "monthly",
      title: `${name.charAt(0).toUpperCase()}${name.slice(1)} fechou`,
      body: "Veja o resumo do mês.",
      url: `/?mes=${iso(last).slice(0, 7)}`,
    };
  }

  // 4. 15 de dezembro: metas para o ano que vem
  if (today.getUTCMonth() === 11 && today.getUTCDate() === 15) {
    return { kind: "newYear", title: `Crie metas para ${today.getUTCFullYear() + 1}`, body: "E já se programe para o ano que vem.", url: "/metas" };
  }

  // 5. Domingo: resumo da semana
  if (today.getUTCDay() === 0) {
    return {
      kind: "weekly",
      title: "Resumo da semana",
      body: "Veja quanto você gastou esta semana.",
      url: "/extrato",
    };
  }

  // 6. Cinco dias sem anotar nada (só no 5º dia, para não repetir todo dia)
  if (c.lastEntry && daysBetween(new Date(c.lastEntry + "T00:00:00Z"), today) === 5) {
    return { kind: "inactive", title: "Sentimos sua falta", body: "Faz alguns dias que você não anota nada. Bora manter em dia?", url: "/anotar" };
  }

  return null;
}

/** Junta do banco tudo o que a regra precisa para uma pessoa. */
export async function dayContext(email: string, today: Date): Promise<DayContext> {
  const [lastSent, bills, { rule }, lastEntry] = await Promise.all([
    db.lastNotificationDay(email),
    db.listBills(email),
    paydayRuleFor(email, today),
    db.lastEntryDay(email),
  ]);
  const payday = rule ? currentCycle(today, rule).payday : null;
  return {
    today, lastSent,
    bills: bills.map((b) => ({ name: b.name, amountCents: b.amountCents, nextDue: b.nextDue })),
    payday: payday && payday >= today ? payday : null,
    lastEntry,
  };
}
