-- Notificações: rode uma vez no SQL Editor do Neon (como dono do banco).

-- Cada aparelho que aceitou receber avisos (uma pessoa pode ter celular e computador)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS push_subscriptions_owner ON push_subscriptions (owner);

-- Quais avisos cada pessoa quer receber (todos ligados por padrão; valores escondidos por padrão)
CREATE TABLE IF NOT EXISTS notification_settings (
  owner VARCHAR(254) PRIMARY KEY,
  bills BOOLEAN NOT NULL DEFAULT true,
  weekly BOOLEAN NOT NULL DEFAULT true,
  monthly BOOLEAN NOT NULL DEFAULT true,
  payday BOOLEAN NOT NULL DEFAULT true,
  inactive BOOLEAN NOT NULL DEFAULT true,
  new_year BOOLEAN NOT NULL DEFAULT true,
  show_values BOOLEAN NOT NULL DEFAULT false,
  -- Para não mandar mais de um aviso por dia
  last_sent_on DATE
);
