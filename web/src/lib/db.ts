// Conversa com o mesmo banco PostgreSQL (Neon) da versão 1.
// As consultas são SQL puro, iguais às do Python.
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, { ssl: process.env.DATABASE_URL?.includes("neon.tech") ? "require" : false });

export type Transaction = {
  id: number;
  kind: "expense" | "income";
  amountCents: number;
  category: string;
  description: string | null;
  occurredOn: Date;
};

export async function isMember(email: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM members WHERE email = ${email}`;
  return rows.length > 0;
}

/** Lançamentos entre `start` (incluído) e `end` (não incluído), do mais novo ao mais antigo. */
export async function listTransactions(owner: string, start: Date, end: Date): Promise<Transaction[]> {
  const rows = await sql`
    SELECT id, kind, amount_cents, category, description, occurred_on
    FROM transactions
    WHERE owner = ${owner} AND occurred_on >= ${start} AND occurred_on < ${end}
    ORDER BY occurred_on DESC, id DESC
  `;
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    amountCents: r.amount_cents,
    category: r.category,
    description: r.description,
    occurredOn: r.occurred_on,
  }));
}
