-- Metas: rode uma vez no SQL Editor do Neon (como dono do banco).
-- O NorthFinance não guarda dinheiro: aqui a pessoa só anota quanto guardou (ou tirou) para cada meta.
CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  name VARCHAR(60) NOT NULL,
  icon VARCHAR(20) NOT NULL,
  target_cents INTEGER NOT NULL CHECK (target_cents > 0),
  -- Onde o dinheiro fica (opcional), ex.: "caixinha do banco"
  place VARCHAR(60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_owner ON goals (owner);

-- Cada vez que a pessoa anota que guardou (valor positivo) ou tirou (valor negativo)
CREATE TABLE IF NOT EXISTS goal_entries (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  goal_id INTEGER NOT NULL REFERENCES goals (id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
  occurred_on DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goal_entries_owner ON goal_entries (owner, occurred_on);
