-- Gastos fixos: rode uma vez no SQL Editor do Neon (como dono do banco).
CREATE TABLE IF NOT EXISTS recurring_transactions (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  kind VARCHAR(10) NOT NULL,
  amount_cents INTEGER NOT NULL,
  category VARCHAR(40) NOT NULL,
  description VARCHAR(100),
  day_of_month SMALLINT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  -- Último mês em que o lançamento já foi feito (primeiro dia do mês)
  last_month DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS recurring_transactions_owner ON recurring_transactions (owner);

-- O usuário limitado do app pode ler e escrever nela (mas não apagar a tabela)
GRANT SELECT, INSERT, UPDATE, DELETE ON recurring_transactions TO app_user;
GRANT USAGE, SELECT ON SEQUENCE recurring_transactions_id_seq TO app_user;
