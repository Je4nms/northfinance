-- Assistente de IA: rode uma vez no SQL Editor do Neon (como dono do banco).

-- Quando a pessoa aceitou que os lançamentos sejam enviados à IA para responder (LGPD)
ALTER TABLE members ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;

-- Uma linha por pergunta: serve para o limite de 20 perguntas por dia
CREATE TABLE IF NOT EXISTS ai_usage (
  id SERIAL PRIMARY KEY,
  owner VARCHAR(254) NOT NULL,
  asked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_usage_owner ON ai_usage (owner, asked_at);
