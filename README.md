# 🧭 NorthFinance

> O app de finanças mais simples que existe.

Eu usava um app de finanças com informação demais na tela, confuso e difícil de entender. O NorthFinance é a versão que eu queria usar: **anotar um gasto em segundos** e ver **para onde o dinheiro está indo**, sem bagunça.

🚧 **Em construção.** Versão atual: anotar gastos e ver o resumo do mês. Próximo passo: login com Google, para família e amigos usarem.

## Regra de ouro

**Pouca informação na tela, fácil de entender de primeira.** Toda função nova precisa deixar o app mais simples, não mais bagunçado.

## O que ele faz

- **Anotar gasto:** valor, categoria, descrição (opcional) e data.
- **Resumo do mês:** quanto foi gasto e quanto em cada categoria.
- **Lista dos gastos do mês**, com opção de apagar.

## Tecnologias

| Tecnologia | Para quê |
|---|---|
| Python | Linguagem principal |
| Streamlit | Transforma o código Python em site, que funciona no celular |
| PostgreSQL (Neon) | Banco de dados online onde os gastos ficam salvos |
| SQLAlchemy + SQL | Conversa com o banco de dados |

## Como rodar

1. Crie um banco gratuito em <https://neon.com> e copie a **connection string**.
2. Copie o modelo das configurações e preencha:
   ```bash
   cp .streamlit/secrets.toml.example .streamlit/secrets.toml
   ```
3. Rode:
   ```bash
   streamlit run app.py
   ```
