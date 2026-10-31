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
