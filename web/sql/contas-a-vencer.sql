-- Contas a vencer: rode uma vez no SQL Editor do Neon (como dono do banco).
CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  name VARCHAR(60) NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  category VARCHAR(40) NOT NULL,
  due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
  -- Próximo vencimento que ainda não foi pago
  next_due DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bills_owner ON bills (owner, next_due);
