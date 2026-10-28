"""NorthFinance: o app de finanças mais simples que existe.

Regra de ouro do produto: pouca informação na tela, fácil de entender de primeira.
"""

import hmac
from datetime import datetime
from itertools import groupby
from zoneinfo import ZoneInfo

import streamlit as st
from sqlalchemy import create_engine

from northfinance import db, ui
from northfinance.categories import CATEGORIES, INCOME_CATEGORIES
from northfinance.money import day_label, month_name, month_range, to_brl, to_cents

st.set_page_config(page_title="NorthFinance", page_icon="assets/icon.png")
st.html(ui.styles(st.context.theme.type or "light"))


# --- Entrada ---
# Enquanto o login com Google não chega (sessão 2), uma senha simples
# impede que qualquer pessoa com o link veja os lançamentos.
if not st.session_state.get("unlocked"):
    st.html(ui.welcome())
    with st.form("login", border=False):
        password = st.text_input("Senha", type="password", placeholder="Digite a sua senha")
        if st.form_submit_button("Entrar", type="primary", width="stretch"):
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

TABS = {
    "inicio": ("Início", ":material/home:"),
    "anotar": ("Anotar", ":material/add_circle:"),
    "extrato": ("Extrato", ":material/receipt_long:"),
    "menu": ("Menu", ":material/menu:"),
}
tab = st.session_state.setdefault("tab", "inicio")


def go_to(new_tab: str) -> None:
    st.session_state.tab = new_tab


def show_transactions(transactions: list[dict], allow_delete: bool) -> None:
    """Lista estilo extrato, separada por dia."""
    for day, items in groupby(transactions, key=lambda t: t["occurred_on"]):
        st.html(ui.day_header(day_label(day, today)))
        for t in items:
            with st.container(key=f"tx-{t['id']}", horizontal=True, gap="small"):
                st.html(ui.transaction_row(t["category"], t["description"], to_brl(t["amount_cents"]), t["kind"]))
                if allow_delete:
                    with st.popover("", icon=":material/more_vert:", type="tertiary"):
                        if st.button("Apagar", icon=":material/delete:", key=f"delete-{t['id']}"):
                            db.delete_transaction(engine, owner, t["id"])
                            st.rerun()


# --- Telas ---
if tab != "anotar":
    st.html(ui.brand())

if tab == "inicio":
    totals = db.month_totals(engine, owner, start, end)
    st.subheader(month_name(today))
    st.html(ui.summary_cards(
        income=to_brl(totals[db.INCOME]),
        expense=to_brl(totals[db.EXPENSE]),
        balance=to_brl(totals[db.INCOME] - totals[db.EXPENSE]),
    ))

    by_category = db.expenses_by_category(engine, owner, start, end)
    if by_category:
        st.markdown("**Para onde foi o dinheiro**")
        for row in by_category:
            share = row["total_cents"] / totals[db.EXPENSE]
            st.progress(share, text=f"{row['category']} · {to_brl(row['total_cents'])} ({share:.0%})")

    recent = db.list_transactions(engine, owner, start, end)[:5]
    if recent:
        st.markdown("**Últimos lançamentos**")
        show_transactions(recent, allow_delete=False)
    else:
        st.info("Nada anotado neste mês ainda. Toque em **Anotar** para começar.")

elif tab == "anotar":
    st.subheader("Anotar")
    kind = st.segmented_control(
        "Tipo",
        [db.EXPENSE, db.INCOME],
        format_func={db.EXPENSE: "Gasto", db.INCOME: "Ganho"}.get,
        default=db.EXPENSE,
        required=True,
        label_visibility="collapsed",
        width="stretch",
    )
    with st.form("new_transaction", clear_on_submit=True, border=False):
        amount = st.number_input("Valor (R$)", min_value=0.0, step=1.0, format="%.2f", value=None, placeholder="0,00")
        category = st.pills("Categoria", CATEGORIES if kind == db.EXPENSE else INCOME_CATEGORIES)
        description = st.text_input("Descrição (opcional)", max_chars=100, placeholder="Ex.: feira do mês")
        occurred_on = st.date_input("Data", value=today, format="DD/MM/YYYY")

        if st.form_submit_button("Salvar", type="primary", width="stretch"):
            if not amount:
                st.error("Coloque o valor.")
            elif not category:
                st.error("Escolha uma categoria.")
            else:
                db.add_transaction(engine, owner, kind, to_cents(amount), category, description, occurred_on)
                st.toast(f"{category}: {to_brl(to_cents(amount))} salvo!", icon="✅")

elif tab == "extrato":
    st.subheader(f"Extrato · {month_name(today)}")
    transactions = db.list_transactions(engine, owner, start, end)
    if transactions:
        show_transactions(transactions, allow_delete=True)
    else:
        st.info("Nenhum lançamento neste mês ainda.")

elif tab == "menu":
    st.subheader("Menu")
    st.markdown(
        "**Sobre o NorthFinance**  \n"
        "O app de finanças mais simples que existe: anote o que entra e o que sai, "
        "e veja para onde o dinheiro está indo."
    )
    if st.button("Sair", icon=":material/logout:", width="stretch"):
        st.session_state.clear()
        st.rerun()

# --- Barra de navegação embaixo ---
with st.container(key="bottom_nav", horizontal=True):
    for key, (label, icon) in TABS.items():
        st.button(
            label,
            icon=icon,
            key=f"nav-{key}",
            type="primary" if key == tab else "tertiary",
            on_click=go_to,
            args=(key,),
        )
