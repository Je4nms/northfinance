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
    text,
)

metadata = MetaData()

# Cada linha é um gasto. O "owner" diz de quem é o gasto: cada pessoa só
# enxerga as linhas com o próprio nome, e é isso que vai permitir a família
# e os amigos usarem o mesmo app.
expenses = Table(
    "expenses",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("owner", String(254), nullable=False, index=True),
    # Guardamos em centavos (número inteiro): R$ 12,50 vira 1250.
    # Número com vírgula no computador às vezes dá diferença de centavos.
    Column("amount_cents", Integer, nullable=False),
    Column("category", String(40), nullable=False),
    Column("description", String(100)),
    Column("spent_on", Date, nullable=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now()),
)


def create_tables(engine: Engine) -> None:
    """Cria a tabela na primeira vez que o app roda. Se ela já existe, não faz nada."""
    metadata.create_all(engine)


def add_expense(
    engine: Engine,
    owner: str,
    amount_cents: int,
    category: str,
    description: str | None,
    spent_on: date,
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text("""
                INSERT INTO expenses (owner, amount_cents, category, description, spent_on)
                VALUES (:owner, :amount_cents, :category, :description, :spent_on)
            """),
            {
                "owner": owner,
                "amount_cents": amount_cents,
                "category": category,
                "description": description or None,
                "spent_on": spent_on,
            },
        )


def list_expenses(engine: Engine, owner: str, start: date, end: date) -> list[dict]:
    """Gastos da pessoa entre `start` (incluído) e `end` (não incluído), do mais novo ao mais antigo."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT id, amount_cents, category, description, spent_on
                FROM expenses
                WHERE owner = :owner AND spent_on >= :start AND spent_on < :end
                ORDER BY spent_on DESC, id DESC
            """),
            {"owner": owner, "start": start, "end": end},
        )
        return [dict(row._mapping) for row in rows]


def totals_by_category(engine: Engine, owner: str, start: date, end: date) -> list[dict]:
    """Quanto a pessoa gastou em cada categoria no período, da maior para a menor."""
    with engine.connect() as conn:
        rows = conn.execute(
            text("""
                SELECT category, SUM(amount_cents) AS total_cents
                FROM expenses
                WHERE owner = :owner AND spent_on >= :start AND spent_on < :end
                GROUP BY category
                ORDER BY total_cents DESC
            """),
            {"owner": owner, "start": start, "end": end},
        )
        return [dict(row._mapping) for row in rows]


def delete_expense(engine: Engine, owner: str, expense_id: int) -> None:
    """Apaga um gasto. O "owner" no WHERE garante que ninguém apaga o gasto de outra pessoa."""
    with engine.begin() as conn:
        conn.execute(
            text("DELETE FROM expenses WHERE id = :id AND owner = :owner"),
            {"id": expense_id, "owner": owner},
        )
