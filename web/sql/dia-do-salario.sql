-- Dia do salário: rode uma vez no SQL Editor do Neon (como dono do banco).
-- payday_kind: 'fixed' (dia fixo), 'fifth_business' (5º dia útil) ou 'last_business' (último dia útil)
ALTER TABLE members ADD COLUMN IF NOT EXISTS payday_kind VARCHAR(16);
ALTER TABLE members ADD COLUMN IF NOT EXISTS payday_day SMALLINT CHECK (payday_day BETWEEN 1 AND 31);
