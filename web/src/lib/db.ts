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
