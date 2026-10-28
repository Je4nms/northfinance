"""Tudo que conversa com o banco de dados (PostgreSQL no Neon).

A tabela é criada com o SQLAlchemy, e as consultas são escritas em SQL,
para dar para ler cada uma em português.
"""

from datetime import date

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    Engine,
    Integer,
    MetaData,
    String,
    Table,
    func,
    inspect,
    text,
)

EXPENSE = "expense"
INCOME = "income"

metadata = MetaData()

# Cada linha é um lançamento: um gasto ou um ganho.
# O "owner" diz de quem é: cada pessoa só enxerga as próprias linhas,
# e é isso que vai permitir a família e os amigos usarem o mesmo app.
transactions = Table(
    "transactions",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("owner", String(254), nullable=False, index=True),
    Column("kind", String(10), nullable=False),  # "expense" (gasto) ou "income" (ganho)
    # Guardamos em centavos (número inteiro): R$ 12,50 vira 1250.
    # Número com vírgula no computador às vezes dá diferença de centavos.
    Column("amount_cents", Integer, nullable=False),
    Column("category", String(40), nullable=False),
    Column("description", String(100)),
    Column("occurred_on", Date, nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)


# Quem já entrou com o código de convite. Fica guardado o e-mail do Google,
# então nas próximas vezes a pessoa entra direto.
members = Table(
    "members",
    metadata,
    Column("email", String(254), primary_key=True),
    Column("name", String(200)),
    Column("joined_at", DateTime(timezone=True), server_default=func.now()),
)


# Sugestões e problemas que as pessoas mandam pelo Menu.
# Para ler: SELECT * FROM feedback ORDER BY created_at DESC;
feedback = Table(
    "feedback",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("email", String(254), nullable=False),
    Column("message", String(1000), nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)


def create_tables(engine: Engine) -> None:
    """Cria a tabela na primeira vez que o app roda. Se ela já existe, não faz nada."""
    metadata.create_all(engine)
    _migrate_old_expenses(engine)


def _migrate_old_expenses(engine: Engine) -> None:
    """Migração: a primeira versão guardava só gastos, numa tabela "expenses".

    Se ela ainda existir, copiamos tudo para "transactions" como gasto
    e apagamos a tabela antiga. Isso acontece uma vez só.
    """
    if not inspect(engine).has_table("expenses"):
        return
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO transactions (owner, kind, amount_cents, category, description, occurred_on, created_at)
            SELECT owner, 'expense', amount_cents, category, description, spent_on, created_at
            FROM expenses
        """))
        conn.execute(text("DROP TABLE expenses"))


def add_transaction(
    engine: Engine,
    owner: str,
    kind: str,
    amount_cents: int,
    category: str,
    description: str | None,
    occurred_on: date,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO transactions (owner, kind, amount_cents, category, description, occurred_on)
                VALUES (:owner, :kind, :amount_cents, :category, :description, :occurred_on)
            """),
            {
                "owner": owner,
                "kind": kind,
                "amount_cents": amount_cents,
                "category": category,
                "description": description or None,
                "occurred_on": occurred_on,
            },
        )


def list_transactions(engine: Engine, owner: str, start: date, end: date) -> list[dict]:
    """Lançamentos entre `start` (incluído) e `end` (não incluído), do mais novo ao mais antigo."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, kind, amount_cents, category, description, occurred_on
                FROM transactions
                WHERE owner = :owner AND occurred_on >= :start AND occurred_on < :end
                ORDER BY occurred_on DESC, id DESC
            """),
            {"owner": owner, "start": start, "end": end},
        )
        return [dict(row._mapping) for row in rows]


def month_totals(engine: Engine, owner: str, start: date, end: date) -> dict[str, int]:
    """Total de ganhos e de gastos no período: {"income": ..., "expense": ...}."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT kind, SUM(amount_cents) AS total_cents
                FROM transactions
                WHERE owner = :owner AND occurred_on >= :start AND occurred_on < :end
                GROUP BY kind
            """),
            {"owner": owner, "start": start, "end": end},
        )
        totals = {INCOME: 0, EXPENSE: 0}
        totals.update({row.kind: row.total_cents for row in rows})
        return totals


def expenses_by_category(engine: Engine, owner: str, start: date, end: date) -> list[dict]:
    """Quanto foi gasto em cada categoria no período, da maior para a menor."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT category, SUM(amount_cents) AS total_cents
                FROM transactions
                WHERE owner = :owner AND kind = 'expense'
                  AND occurred_on >= :start AND occurred_on < :end
                GROUP BY category
                ORDER BY total_cents DESC
            """),
            {"owner": owner, "start": start, "end": end},
        )
        return [dict(row._mapping) for row in rows]


def delete_transaction(engine: Engine, owner: str, transaction_id: int) -> None:
    """Apaga um lançamento. O "owner" no WHERE garante que ninguém apaga o de outra pessoa."""
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM transactions WHERE id = :id AND owner = :owner"),
            {"id": transaction_id, "owner": owner},
        )


def is_member(engine: Engine, email: str) -> bool:
    """Essa pessoa já entrou com o código de convite alguma vez?"""
    with engine.connect() as conn:
        row = conn.execute(
            text("SELECT 1 FROM members WHERE email = :email"),
            {"email": email},
        ).first()
        return row is not None


def add_member(engine: Engine, email: str, name: str | None) -> None:
    """Guarda a pessoa como convidada. Se ela já estiver na lista, não faz nada."""
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO members (email, name)
                VALUES (:email, :name)
                ON CONFLICT (email) DO NOTHING
            """),
            {"email": email, "name": name},
        )


def add_feedback(engine: Engine, email: str, message: str) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO feedback (email, message) VALUES (:email, :message)"),
            {"email": email, "message": message},
        )
