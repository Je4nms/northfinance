<img src="assets/logo.svg" width="72" alt="Logo do NorthFinance">

# NorthFinance

> O app de finanças mais simples que existe.

Eu usava um app de finanças com informação demais na tela, confuso e difícil de entender. O NorthFinance é a versão que eu queria usar: **anotar um gasto em segundos** e ver **para onde o dinheiro está indo**, sem bagunça.

🚧 **Em construção.** Versão atual: login com Google, convite por código, anotar ganhos e gastos, resumo do mês e extrato, com visual de app no celular (claro ou escuro, conforme o aparelho).

## Como usar no celular

Abra **<https://northfinancebr.streamlit.app/?embed=true>** e adicione à tela inicial:
- **iPhone (Safari):** Compartilhar → Adicionar à Tela de Início.
- **Android (Chrome):** menu ⋮ → Adicionar à tela inicial.

O `?embed=true` no final esconde os selos do Streamlit Cloud, que ficariam por cima da barra de navegação.

## Regra de ouro

**Pouca informação na tela, fácil de entender de primeira.** Toda função nova precisa deixar o app mais simples, não mais bagunçado.

## O que ele faz

- **Anotar:** gasto ou ganho, com valor, categoria, descrição (opcional) e data.
- **Início:** quanto sobrou no mês, ganhos, gastos e para onde foi o dinheiro.
- **Extrato:** lançamentos separados por dia, por mês ou por um período escolhido no calendário, com filtro de ganhos e gastos e opção de apagar.
- **Barra de navegação embaixo**, como num app de celular.
- **Login com Google:** cada pessoa vê só os próprios lançamentos. O app nunca vê nem guarda senhas.
- **Convite por código:** na primeira vez, a pessoa digita o código que recebeu de quem a convidou.
- **Menu:** convidar pelo WhatsApp (mensagem pronta com link e código), enviar sugestões e ver a Política de Privacidade.
- **Meta do mês:** a pessoa define no próprio Início quanto quer gastar no máximo, e ele mostra uma barra (verde, laranja a partir de 80%, vermelha quando passa).
- **No computador**, o Início usa duas colunas: resumo de um lado, últimos lançamentos do outro.

## Tecnologias

| Tecnologia | Para quê |
|---|---|
| Python | Linguagem principal |
| Streamlit | Transforma o código Python em site, que funciona no celular |
| PostgreSQL (Neon) | Banco de dados online onde os gastos ficam salvos |
| SQLAlchemy + SQL | Conversa com o banco de dados |
| Login do Streamlit (OpenID Connect) | Entrar com a conta Google |

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

## Lendo as sugestões

As sugestões enviadas pelo Menu ficam na tabela `feedback`. Para ler, no SQL Editor do Neon:

```sql
SELECT email, message, created_at
FROM feedback
ORDER BY created_at DESC;
```
