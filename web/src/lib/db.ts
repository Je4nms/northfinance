// Conversa com o mesmo banco PostgreSQL (Neon) da versão 1.
// As consultas são SQL puro, iguais às do Python. Quem cria as tabelas e colunas
// ainda é a versão 1 (northfinance/db.py), então aqui só lemos e escrevemos.
import postgres from "postgres";

const url = process.env.DATABASE_URL!;
const sql = postgres(url, { ssl: url.includes("neon.tech") ? "require" : false });

export type Kind = "expense" | "income";

export type Transaction = {
  id: number;
  kind: Kind;
  amountCents: number;
  category: string;
  description: string | null;
  occurredOn: Date;
};

function toTransaction(r: postgres.Row): Transaction {
  return {
    id: r.id,
    kind: r.kind,
    amountCents: r.amount_cents,
    category: r.category,
    description: r.description,
    occurredOn: r.occurred_on,
  };
}

// --- Convidados ---

export async function isMember(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM members WHERE email = ${email}`;
  return rows.length > 0;
}

export async function addMember(email: string, name: string | null): Promise<void> {
  await sql`INSERT INTO members (email, name) VALUES (${email}, ${name}) ON CONFLICT (email) DO NOTHING`;
}

/**
 * Limite de tentativas do código de convite: no máximo 5 erros a cada 15 minutos por conta.
 * Assim ninguém consegue ficar "chutando" códigos até acertar.
 */
export async function inviteAttemptsBlocked(email: string): Promise<boolean> {
  // A tabela é criada uma vez só. Depois, o usuário limitado do banco (que não pode criar tabelas) só lê e escreve nela.
  const [{ exists }] = await sql`SELECT to_regclass('invite_attempts') IS NOT NULL AS exists`;
  if (!exists) {
    await sql`
      CREATE TABLE invite_attempts (
        email VARCHAR(254) NOT NULL,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
  }
  const rows = await sql`
    SELECT COUNT(*)::int AS n FROM invite_attempts
    WHERE email = ${email} AND attempted_at > now() - interval '15 minutes'
  `;
  return rows[0].n >= 5;
}

export async function recordFailedInvite(email: string): Promise<void> {
  await sql`INSERT INTO invite_attempts (email) VALUES (${email})`;
}

// --- Lançamentos ---

/** Lançamentos entre `start` (incluído) e `end` (não incluído), do mais novo ao mais antigo. */
export async function listTransactions(owner: string, start: Date, end: Date): Promise<Transaction[]> {
  const rows = await sql`
    SELECT id, kind, amount_cents, category, description, occurred_on
    FROM transactions
    WHERE owner = ${owner} AND occurred_on >= ${start} AND occurred_on < ${end}
    ORDER BY occurred_on DESC, id DESC
  `;
  return rows.map(toTransaction);
}

export async function addTransaction(
  owner: string,
  t: { kind: Kind; amountCents: number; category: string; description: string | null; occurredOn: string },
): Promise<void> {
  await sql`
    INSERT INTO transactions (owner, kind, amount_cents, category, description, occurred_on)
    VALUES (${owner}, ${t.kind}, ${t.amountCents}, ${t.category}, ${t.description}, ${t.occurredOn})
  `;
}

/** O "owner" no WHERE garante que ninguém apaga o lançamento de outra pessoa. */
export async function deleteTransaction(owner: string, id: number): Promise<void> {
  await sql`DELETE FROM transactions WHERE id = ${id} AND owner = ${owner}`;
}

export async function monthTotals(owner: string, start: Date, end: Date): Promise<Record<Kind, number>> {
  const rows = await sql`
    SELECT kind, SUM(amount_cents)::int AS total
    FROM transactions
    WHERE owner = ${owner} AND occurred_on >= ${start} AND occurred_on < ${end}
    GROUP BY kind
  `;
  const totals: Record<Kind, number> = { income: 0, expense: 0 };
  for (const r of rows) totals[r.kind as Kind] = r.total;
  return totals;
}

export async function expensesByCategory(owner: string, start: Date, end: Date) {
  const rows = await sql`
    SELECT category, SUM(amount_cents)::int AS total
    FROM transactions
    WHERE owner = ${owner} AND kind = 'expense' AND occurred_on >= ${start} AND occurred_on < ${end}
    GROUP BY category
    ORDER BY total DESC
  `;
  return rows.map((r) => ({ category: r.category as string, totalCents: r.total as number }));
}

// --- Meta do mês ---

export async function getGoal(email: string): Promise<number | null> {
  const rows = await sql`SELECT monthly_goal_cents FROM members WHERE email = ${email}`;
  return rows[0]?.monthly_goal_cents ?? null;
}

export async function setGoal(email: string, goalCents: number | null): Promise<void> {
  await sql`UPDATE members SET monthly_goal_cents = ${goalCents} WHERE email = ${email}`;
}

// --- Sugestões e "Está curtindo?" ---

export async function addFeedback(email: string, message: string): Promise<void> {
  await sql`INSERT INTO feedback (email, message) VALUES (${email}, ${message})`;
}

/** Perguntar "Está curtindo?" só para quem já anotou 5 lançamentos e ainda não respondeu. */
export async function shouldAskEnjoying(email: string): Promise<boolean> {
  const rows = await sql`
    SELECT m.enjoying IS NULL
       AND (SELECT COUNT(*) FROM transactions t WHERE t.owner = m.email) >= 5 AS ask
    FROM members m
    WHERE m.email = ${email}
  `;
  return Boolean(rows[0]?.ask);
}

export async function setEnjoying(email: string, answer: string): Promise<void> {
  await sql`UPDATE members SET enjoying = ${answer} WHERE email = ${email}`;
}

// --- Editar lançamento ---

export async function getTransaction(owner: string, id: number): Promise<Transaction | null> {
  const rows = await sql`
    SELECT id, kind, amount_cents, category, description, occurred_on
    FROM transactions WHERE id = ${id} AND owner = ${owner}
  `;
  return rows[0] ? toTransaction(rows[0]) : null;
}

/** O "owner" no WHERE garante que ninguém edita o lançamento de outra pessoa. */
export async function updateTransaction(
  owner: string,
  id: number,
  t: { kind: Kind; amountCents: number; category: string; description: string | null; occurredOn: string },
): Promise<void> {
  await sql`
    UPDATE transactions
    SET kind = ${t.kind}, amount_cents = ${t.amountCents}, category = ${t.category},
        description = ${t.description}, occurred_on = ${t.occurredOn}
    WHERE id = ${id} AND owner = ${owner}
  `;
}

// --- Gráfico por dia e comparação com o mês passado ---

/** Quanto foi gasto em cada dia do período: { "2026-10-05": 12345, ... } */
export async function expensesByDay(owner: string, start: Date, end: Date): Promise<Map<string, number>> {
  const rows = await sql`
    SELECT occurred_on::text AS day, SUM(amount_cents)::int AS total
    FROM transactions
    WHERE owner = ${owner} AND kind = 'expense' AND occurred_on >= ${start} AND occurred_on < ${end}
    GROUP BY occurred_on
  `;
  return new Map(rows.map((r) => [r.day as string, r.total as number]));
}

export async function expensesBetween(owner: string, start: Date, end: Date): Promise<number> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS total
    FROM transactions
    WHERE owner = ${owner} AND kind = 'expense' AND occurred_on >= ${start} AND occurred_on < ${end}
  `;
  return rows[0].total;
}

// --- Gastos fixos (lançados sozinhos todo mês) ---
// A tabela recurring_transactions é criada pelo SQL do README (o usuário limitado não cria tabelas).

export type Recurring = {
  id: number;
  kind: Kind;
  amountCents: number;
  category: string;
  description: string | null;
  dayOfMonth: number;
};

async function recurringReady(): Promise<boolean> {
  const [{ ok }] = await sql`SELECT to_regclass('recurring_transactions') IS NOT NULL AS ok`;
  return ok;
}

export async function listRecurring(owner: string): Promise<Recurring[]> {
  if (!(await recurringReady())) return [];
  const rows = await sql`
    SELECT id, kind, amount_cents, category, description, day_of_month
    FROM recurring_transactions WHERE owner = ${owner} ORDER BY day_of_month, id
  `;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    amountCents: r.amount_cents,
    category: r.category,
    description: r.description,
    dayOfMonth: r.day_of_month,
  }));
}

/** Guarda um gasto fixo. O lançamento deste mês é feito junto, então ele começa a valer no próximo. */
export async function addRecurring(
  owner: string,
  t: { kind: Kind; amountCents: number; category: string; description: string | null; dayOfMonth: number; startMonth: string },
): Promise<boolean> {
  if (!(await recurringReady())) return false;
  await sql`
    INSERT INTO recurring_transactions (owner, kind, amount_cents, category, description, day_of_month, last_month)
    VALUES (${owner}, ${t.kind}, ${t.amountCents}, ${t.category}, ${t.description}, ${t.dayOfMonth}, ${t.startMonth})
  `;
  return true;
}

export async function deleteRecurring(owner: string, id: number): Promise<void> {
  await sql`DELETE FROM recurring_transactions WHERE id = ${id} AND owner = ${owner}`;
}

/**
 * Lança os gastos fixos que já "venceram" neste mês e ainda não foram lançados.
 * Roda sempre que a pessoa abre o Início. `month` é o primeiro dia do mês atual.
 */
export async function runRecurring(owner: string, today: Date): Promise<void> {
  if (!(await recurringReady())) return;
  const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const lastDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  await sql.begin(async (tx) => {
    const due = await tx`
      SELECT id, kind, amount_cents, category, description, day_of_month
      FROM recurring_transactions
      WHERE owner = ${owner} AND last_month < ${month}
        AND LEAST(day_of_month, ${lastDay}) <= ${today.getUTCDate()}
      FOR UPDATE
    `;
    for (const r of due) {
      const day = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), Math.min(r.day_of_month, lastDay)));
      await tx`
        INSERT INTO transactions (owner, kind, amount_cents, category, description, occurred_on)
        VALUES (${owner}, ${r.kind}, ${r.amount_cents}, ${r.category}, ${r.description}, ${day})
      `;
      await tx`UPDATE recurring_transactions SET last_month = ${month} WHERE id = ${r.id}`;
    }
  });
}

// --- Contas a vencer (avisam antes do vencimento; você confirma quando pagar) ---
// A tabela bills é criada pelo SQL em web/sql/contas-a-vencer.sql.

export type Bill = {
  id: number;
  name: string;
  amountCents: number;
  category: string;
  dueDay: number;
  nextDue: Date;
};

async function billsReady(): Promise<boolean> {
  const [{ ok }] = await sql`SELECT to_regclass('bills') IS NOT NULL AS ok`;
  return ok;
}

function toBill(r: postgres.Row): Bill {
  return {
    id: r.id,
    name: r.name,
    amountCents: r.amount_cents,
    category: r.category,
    dueDay: r.due_day,
    nextDue: new Date(r.next_due + "T00:00:00Z"),
  };
}

// Função (e não constante) para criar um pedaço novo de SQL a cada consulta
const billColumns = () => sql`id, name, amount_cents, category, due_day, next_due::text AS next_due`;

/** Todas as contas, da que vence primeiro para a última. */
export async function listBills(owner: string): Promise<Bill[]> {
  if (!(await billsReady())) return [];
  const rows = await sql`SELECT ${billColumns()} FROM bills WHERE owner = ${owner} ORDER BY next_due, id`;
  return rows.map(toBill);
}

export async function getBill(owner: string, id: number): Promise<Bill | null> {
  if (!(await billsReady())) return null;
  const rows = await sql`SELECT ${billColumns()} FROM bills WHERE id = ${id} AND owner = ${owner}`;
  return rows[0] ? toBill(rows[0]) : null;
}

export async function addBill(
  owner: string,
  b: { name: string; amountCents: number; category: string; dueDay: number; nextDue: string },
): Promise<boolean> {
  if (!(await billsReady())) return false;
  await sql`
    INSERT INTO bills (owner, name, amount_cents, category, due_day, next_due)
    VALUES (${owner}, ${b.name}, ${b.amountCents}, ${b.category}, ${b.dueDay}, ${b.nextDue})
  `;
  return true;
}

export async function deleteBill(owner: string, id: number): Promise<void> {
  if (!(await billsReady())) return;
  await sql`DELETE FROM bills WHERE id = ${id} AND owner = ${owner}`;
}

/**
 * "Paguei": lança o gasto e passa o vencimento para o mês seguinte, as duas coisas juntas.
 * O `expectedDue` evita lançar duas vezes se a pessoa tocar duas vezes em Confirmar.
 */
export async function payBill(
  owner: string,
  id: number,
  p: { amountCents: number; paidOn: string; expectedDue: string; nextDue: string },
): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [bill] = await tx`
      SELECT name, category FROM bills
      WHERE id = ${id} AND owner = ${owner} AND next_due = ${p.expectedDue}
      FOR UPDATE
    `;
    if (!bill) return false;
    await tx`
      INSERT INTO transactions (owner, kind, amount_cents, category, description, occurred_on)
      VALUES (${owner}, 'expense', ${p.amountCents}, ${bill.category}, ${bill.name}, ${p.paidOn})
    `;
    await tx`UPDATE bills SET next_due = ${p.nextDue} WHERE id = ${id}`;
    return true;
  });
}

// --- Dia do salário e "Sobrou dinheiro?" ---

/** Erro do Postgres "coluna não existe": o SQL do dia do salário ainda não foi rodado. */
const missingColumn = (e: unknown) => (e as { code?: string })?.code === "42703";
// As colunas payday_kind e payday_day são criadas por web/sql/dia-do-salario.sql.

const SALARY = "💼 Salário";

/** A regra salva pela pessoa, ou null (não escolheu ainda, ou o SQL ainda não foi rodado). */
export async function getPaydayRule(email: string): Promise<{ kind: string; day: number | null } | null> {
  try {
    const rows = await sql`SELECT payday_kind, payday_day FROM members WHERE email = ${email}`;
    return rows[0]?.payday_kind ? { kind: rows[0].payday_kind, day: rows[0].payday_day } : null;
  } catch (e) {
    if (missingColumn(e)) return null;
    throw e;
  }
}

/** Salva a regra. Devolve false se as colunas ainda não existem no banco. */
export async function setPaydayRule(email: string, kind: string, day: number | null): Promise<boolean> {
  try {
    await sql`UPDATE members SET payday_kind = ${kind}, payday_day = ${day} WHERE email = ${email}`;
    return true;
  } catch (e) {
    if (missingColumn(e)) return false;
    throw e;
  }
}

/** Dia do maior salário de cada mês, desde `since` (para descobrir a regra sozinho). */
export async function salaryDays(owner: string, since: Date): Promise<Date[]> {
  const rows = await sql`
    SELECT DISTINCT ON (date_trunc('month', occurred_on)) occurred_on::text AS day
    FROM transactions
    WHERE owner = ${owner} AND kind = 'income' AND category = ${SALARY} AND occurred_on >= ${since}
    ORDER BY date_trunc('month', occurred_on), amount_cents DESC
  `;
  return rows.map((r) => new Date(r.day + "T00:00:00Z"));
}

/** Se algum salário já foi anotado a partir de `since` (para a linha sumir quando o salário entra). */
export async function salaryRecordedSince(owner: string, since: Date): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM transactions
    WHERE owner = ${owner} AND kind = 'income' AND category = ${SALARY} AND occurred_on >= ${since}
    LIMIT 1
  `;
  return rows.length > 0;
}

/** Gasto médio por mês entre `start` e `end`, contando só os meses que tiveram gastos. */
export async function averageMonthlyExpense(owner: string, start: Date, end: Date): Promise<number | null> {
  const rows = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::bigint AS total,
           COUNT(DISTINCT date_trunc('month', occurred_on))::int AS months
    FROM transactions
    WHERE owner = ${owner} AND kind = 'expense' AND occurred_on >= ${start} AND occurred_on < ${end}
  `;
  const months = rows[0].months as number;
  return months > 0 ? Math.round(Number(rows[0].total) / months) : null;
}

// --- Categorias que a pessoa mais usa (para o Anotar mostrar só as principais) ---

export async function topExpenseCategories(owner: string, since: Date): Promise<string[]> {
  const rows = await sql`
    SELECT category FROM transactions
    WHERE owner = ${owner} AND kind = 'expense' AND occurred_on >= ${since}
    GROUP BY category
    ORDER BY COUNT(*) DESC, MAX(occurred_on) DESC
    LIMIT 5
  `;
  return rows.map((r) => r.category as string);
}

// --- Metas (a pessoa anota quanto guardou; o app não guarda nem movimenta dinheiro) ---
// As tabelas goals e goal_entries são criadas por web/sql/metas.sql.

export type Goal = {
  id: number;
  name: string;
  icon: string;
  targetCents: number;
  place: string | null;
  savedCents: number;
};

export type GoalEntry = { id: number; goalId: number; goalName: string; goalIcon: string; amountCents: number; occurredOn: Date };

export async function goalsReady(): Promise<boolean> {
  const [{ ok }] = await sql`SELECT to_regclass('goal_entries') IS NOT NULL AS ok`;
  return ok;
}

export async function listGoals(owner: string): Promise<Goal[]> {
  if (!(await goalsReady())) return [];
  const rows = await sql`
    SELECT g.id, g.name, g.icon, g.target_cents, g.place,
           COALESCE((SELECT SUM(e.amount_cents) FROM goal_entries e WHERE e.goal_id = g.id), 0)::int AS saved
    FROM goals g WHERE g.owner = ${owner}
    ORDER BY g.created_at, g.id
  `;
  return rows.map((r) => ({ id: r.id, name: r.name, icon: r.icon, targetCents: r.target_cents, place: r.place, savedCents: r.saved }));
}

export async function addGoal(owner: string, g: { name: string; icon: string; targetCents: number; place: string | null }): Promise<boolean> {
  if (!(await goalsReady())) return false;
  await sql`INSERT INTO goals (owner, name, icon, target_cents, place) VALUES (${owner}, ${g.name}, ${g.icon}, ${g.targetCents}, ${g.place})`;
  return true;
}

export async function updateGoal(owner: string, id: number, g: { name: string; icon: string; targetCents: number; place: string | null }): Promise<void> {
  await sql`
    UPDATE goals SET name = ${g.name}, icon = ${g.icon}, target_cents = ${g.targetCents}, place = ${g.place}
    WHERE id = ${id} AND owner = ${owner}
  `;
}

/** Apaga a meta e o histórico dela (ON DELETE CASCADE). */
export async function deleteGoal(owner: string, id: number): Promise<void> {
  await sql`DELETE FROM goals WHERE id = ${id} AND owner = ${owner}`;
}

/** Quanto já foi guardado numa meta (só se ela for da pessoa). */
export async function goalSaved(owner: string, id: number): Promise<{ name: string; targetCents: number; savedCents: number } | null> {
  const rows = await sql`
    SELECT g.name, g.target_cents, COALESCE(SUM(e.amount_cents), 0)::int AS saved
    FROM goals g LEFT JOIN goal_entries e ON e.goal_id = g.id
    WHERE g.id = ${id} AND g.owner = ${owner}
    GROUP BY g.id
  `;
  return rows[0] ? { name: rows[0].name, targetCents: rows[0].target_cents, savedCents: rows[0].saved } : null;
}

export async function addGoalEntry(owner: string, goalId: number, amountCents: number, occurredOn: string): Promise<void> {
  await sql`
    INSERT INTO goal_entries (owner, goal_id, amount_cents, occurred_on)
    SELECT ${owner}, id, ${amountCents}, ${occurredOn} FROM goals WHERE id = ${goalId} AND owner = ${owner}
  `;
}

export async function deleteGoalEntry(owner: string, id: number): Promise<void> {
  await sql`DELETE FROM goal_entries WHERE id = ${id} AND owner = ${owner}`;
}

/** Anotações de guardar/tirar entre `start` (incluído) e `end` (não incluído); `goalId` filtra uma meta. */
export async function listGoalEntries(owner: string, start: Date, end: Date, goalId?: number): Promise<GoalEntry[]> {
  if (!(await goalsReady())) return [];
  const rows = await sql`
    SELECT e.id, e.goal_id, g.name, g.icon, e.amount_cents, e.occurred_on::text AS day
    FROM goal_entries e JOIN goals g ON g.id = e.goal_id
    WHERE e.owner = ${owner} AND e.occurred_on >= ${start} AND e.occurred_on < ${end}
      ${goalId ? sql`AND e.goal_id = ${goalId}` : sql``}
    ORDER BY e.occurred_on DESC, e.id DESC
  `;
  return rows.map((r) => ({
    id: r.id, goalId: r.goal_id, goalName: r.name, goalIcon: r.icon, amountCents: r.amount_cents,
    occurredOn: new Date(r.day + "T00:00:00Z"),
  }));
}

/** Quanto foi guardado (menos o que foi tirado) entre `start` e `end`. Entra no "Sobrou no mês". */
export async function savedBetween(owner: string, start: Date, end: Date): Promise<number> {
  if (!(await goalsReady())) return 0;
  const rows = await sql`
    SELECT COALESCE(SUM(amount_cents), 0)::int AS total FROM goal_entries
    WHERE owner = ${owner} AND occurred_on >= ${start} AND occurred_on < ${end}
  `;
  return rows[0].total;
}
