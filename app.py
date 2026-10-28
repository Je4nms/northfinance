"""NorthFinance: o app de finanças mais simples que existe.

Regra de ouro do produto: pouca informação na tela, fácil de entender de primeira.
"""

import hmac
from datetime import datetime
from zoneinfo import ZoneInfo

import streamlit as st
from sqlalchemy import create_engine

from northfinance import db
from northfinance.categories import CATEGORIES
from northfinance.money import month_name, month_range, to_brl, to_cents

st.set_page_config(page_title="NorthFinance", page_icon="🧭")
st.title("🧭 NorthFinance")
st.caption("O norte das suas finanças")


# Enquanto o login com Google não chega (sessão 2), uma senha simples
# impede que qualquer pessoa com o link veja os gastos.
if not st.session_state.get("unlocked"):
    password = st.text_input("Senha", type="password")
    if password:
        if hmac.compare_digest(password, st.secrets["app_password"]):
            st.session_state.unlocked = True
            st.rerun()
        st.error("Senha errada.")
    st.stop()


# A conexão com o banco é criada uma vez só e reaproveitada.
# O pool_pre_ping testa a conexão antes de usar: o Neon "dorme" quando
# ninguém usa, e assim o app reconecta sozinho quando ele acorda.
@st.cache_resource
def get_engine():
    engine = create_engine(
        st.secrets["database_url"].replace("postgresql://", "postgresql+psycopg://", 1),
        pool_pre_ping=True,
    )
    db.create_tables(engine)
    return engine


engine = get_engine()
owner = st.secrets["owner"]
today = datetime.now(ZoneInfo("America/Sao_Paulo")).date()
start, end = month_range(today)

# --- Anotar gasto: a ação principal fica no topo ---
with st.form("new_expense", clear_on_submit=True, border=True):
    st.subheader("Anotar gasto")
    amount = st.number_input("Valor (R$)", min_value=0.0, step=1.0, format="%.2f", value=None, placeholder="0,00")
    category = st.pills("Categoria", CATEGORIES)
    description = st.text_input("Descrição (opcional)", max_chars=100, placeholder="Ex.: feira do mês")
    spent_on = st.date_input("Data", value=today, format="DD/MM/YYYY")

    if st.form_submit_button("Salvar", type="primary", width="stretch"):
        if not amount:
            st.error("Coloque o valor do gasto.")
        elif not category:
            st.error("Escolha uma categoria.")
        else:
            db.add_expense(engine, owner, to_cents(amount), category, description, spent_on)
            st.toast(f"{category}: {to_brl(to_cents(amount))} salvo!", icon="✅")

# --- Resumo do mês ---
st.subheader(month_name(today))
totals = db.totals_by_category(engine, owner, start, end)
month_total = sum(row["total_cents"] for row in totals)
st.metric("Gasto no mês", to_brl(month_total))

for row in totals:
    share = row["total_cents"] / month_total
    st.progress(share, text=f"{row['category']} · {to_brl(row['total_cents'])} ({share:.0%})")

# --- Gastos do mês, com opção de apagar ---
expenses = db.list_expenses(engine, owner, start, end)
if expenses:
    with st.expander(f"Gastos do mês ({len(expenses)})"):
        for expense in expenses:
            label = f"{expense['spent_on']:%d/%m} · {expense['category']}"
            if expense["description"]:
                label += f" · {expense['description']}"
            col_text, col_delete = st.columns([5, 1], vertical_alignment="center")
            col_text.write(f"{label} — **{to_brl(expense['amount_cents'])}**")
            if col_delete.button("🗑️", key=f"delete-{expense['id']}", help="Apagar"):
                db.delete_expense(engine, owner, expense["id"])
                st.rerun()
else:
    st.info("Nenhum gasto anotado neste mês ainda.")
