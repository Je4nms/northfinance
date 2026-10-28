"""NorthFinance: o app de finanças mais simples que existe.

Regra de ouro do produto: pouca informação na tela, fácil de entender de primeira.
"""

import hmac
from datetime import datetime
from itertools import groupby
from pathlib import Path
from urllib.parse import quote
from zoneinfo import ZoneInfo

import streamlit as st
from sqlalchemy import create_engine

from northfinance import db, ui
from northfinance.categories import CATEGORIES, INCOME_CATEGORIES
from northfinance.money import day_label, month_name, month_range, to_brl, to_cents

st.set_page_config(page_title="NorthFinance", page_icon="assets/icon.png")
st.html(ui.styles(st.context.theme.type or "light"))


PRIVACY_POLICY = Path(__file__).parent / "northfinance" / "privacy.md"
# Endereço que vai nos convites. O "?embed=true" esconde os selos do Streamlit Cloud.
APP_URL = "https://northfinance-je4nms.streamlit.app/?embed=true"

# --- Política de Privacidade: aberta para qualquer pessoa, sem login ---
# Endereço: .../?pagina=privacidade (o Google exige essa página para liberar o login)
if st.query_params.get("pagina") == "privacidade":
    st.html(ui.brand())
    st.markdown(PRIVACY_POLICY.read_text())
    st.stop()


# --- Entrada: login com Google ---
# Quem confere a identidade é o Google: o app nunca vê nem guarda senha de ninguém.
if not st.user.is_logged_in:
    st.html(ui.welcome(st.context.theme.type or "light"))
    if st.button("Entrar com Google", icon=":material/login:", type="primary", width="stretch"):
        st.login()
    st.html(ui.privacy_link())
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
# Cada lançamento é guardado com o e-mail do Google de quem anotou
owner = st.user.email.lower()

# --- Primeira vez: código de convite ---
# Por enquanto o app é só para convidados. Quem tem o código entra uma vez
# e o e-mail fica guardado na tabela "members"; nas próximas, entra direto.
if not db.is_member(engine, owner):
    st.html(ui.welcome(st.context.theme.type or "light"))
    st.markdown(f"Olá, **{st.user.name or owner}**! Falta só uma coisa: o **código de convite**.")
    with st.form("invite", border=False):
        code = st.text_input("Código de convite", placeholder="Ex.: NORTE2026")
        if st.form_submit_button("Continuar", type="primary", width="stretch"):
            if hmac.compare_digest(code.strip().upper(), st.secrets["invite_code"].strip().upper()):
                db.add_member(engine, owner, st.user.name)
                st.rerun()
            st.error("Código errado. Peça o código para quem te convidou.")
    if st.button("Entrar com outra conta", icon=":material/switch_account:", type="tertiary"):
        st.logout()
    st.stop()

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
    # No PC, duas colunas: resumo à esquerda e últimos lançamentos à direita.
    # No celular, o Streamlit empilha as colunas, uma embaixo da outra.
    st.html(ui.wide_layout())
    col_summary, col_recent = st.columns(2, gap="large")

    with col_summary:
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

    with col_recent:
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
                label = "Ganho" if kind == db.INCOME else "Gasto"
                st.toast(f"{label} salvo · {to_brl(to_cents(amount))}", icon=":material/check_circle:")

elif tab == "extrato":
    st.subheader(f"Extrato · {month_name(today)}")
    transactions = db.list_transactions(engine, owner, start, end)
    if transactions:
        show_transactions(transactions, allow_delete=True)
    else:
        st.info("Nenhum lançamento neste mês ainda.")

elif tab == "menu":
    st.subheader("Menu")

    with st.container(border=True):
        st.markdown("**:material/group_add: Convidar alguém**")
        st.caption("Mande o NorthFinance para a família e os amigos. A mensagem já vai com o link e o código.")
        invite_message = (
            "Oi! Estou usando o NorthFinance para organizar minhas finanças. "
            f"Entra com a sua conta Google: {APP_URL} "
            f"Código de convite: {st.secrets['invite_code']}"
        )
        st.code(invite_message, language=None, wrap_lines=True)
        st.link_button(
            "Enviar no WhatsApp",
            f"https://wa.me/?text={quote(invite_message)}",
            icon=":material/send:",
            type="primary",
            width="stretch",
        )

    with st.container(border=True):
        st.markdown("**:material/chat: Enviar sugestão**")
        with st.form("feedback", clear_on_submit=True, border=False):
            message = st.text_area(
                "Sugestão",
                max_chars=1000,
                placeholder="Uma ideia, algo que não funcionou, o que você sentiu falta...",
                label_visibility="collapsed",
            )
            if st.form_submit_button("Enviar", icon=":material/send:", width="stretch"):
                if message.strip():
                    db.add_feedback(engine, owner, message.strip())
                    st.toast("Sugestão enviada. Obrigado!", icon=":material/favorite:")
                else:
                    st.error("Escreva a sua sugestão antes de enviar.")

    with st.container(border=True):
        st.markdown("**:material/info: Sobre o NorthFinance**")
        st.caption(
            "O app de finanças mais simples que existe: anote o que entra e o que sai, "
            "e veja para onde o dinheiro está indo."
        )
        st.markdown("[Política de Privacidade](?pagina=privacidade)")

    with st.container(border=True):
        st.markdown("**:material/account_circle: Conta**")
        st.caption(f"Conectado como **{st.user.name or owner}** ({owner})")
        if st.button("Sair", icon=":material/logout:", width="stretch"):
            st.logout()

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
