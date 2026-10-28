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
from northfinance.money import day_label, greeting, month_name, month_range, shift_month, to_brl, to_cents

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

now = datetime.now(ZoneInfo("America/Sao_Paulo"))
today = now.date()

# Mês que a pessoa está vendo: 0 = o mês atual, -1 = o anterior, e assim por diante
month_offset = st.session_state.setdefault("month_offset", 0)
viewed_month = shift_month(today, month_offset)
start, end = month_range(viewed_month)

# Botão do olho: esconde os valores (bom para abrir o app perto dos outros)
hide_values = st.session_state.setdefault("hide_values", False)


def fmt(cents: int) -> str:
    """Valor em reais, ou escondido se o olho estiver fechado."""
    return "R$ •••••" if hide_values else to_brl(cents)


def change_month(step: int) -> None:
    st.session_state.month_offset = min(0, st.session_state.month_offset + step)


def toggle_values() -> None:
    st.session_state.hide_values = not st.session_state.hide_values


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
                st.html(ui.transaction_row(t["category"], t["description"], fmt(t["amount_cents"]), t["kind"]))
                if allow_delete:
                    with st.popover("", icon=":material/more_vert:", type="tertiary"):
                        if st.button("Apagar", icon=":material/delete:", key=f"delete-{t['id']}"):
                            db.delete_transaction(engine, owner, t["id"])
                            st.rerun()


def month_navigation() -> None:
    """‹ Outubro de 2026 ›: anda entre os meses (não deixa ir para o futuro)."""
    with st.container(key="month_nav", horizontal=True):
        st.button("", icon=":material/chevron_left:", key="month_prev", type="tertiary",
                  on_click=change_month, args=(-1,), help="Mês anterior")
        st.markdown(month_name(viewed_month))
        st.button("", icon=":material/chevron_right:", key="month_next", type="tertiary",
                  on_click=change_month, args=(1,), disabled=month_offset == 0, help="Próximo mês")


# --- Telas ---
theme = st.context.theme.type or "light"
if tab not in ("anotar", "inicio"):
    st.html(ui.brand())

if tab == "inicio":
    first_name = (st.user.name or owner).split()[0]
    with st.container(key="hero_row", horizontal=True):
        st.html(ui.hero(theme, greeting(now.hour), first_name, st.user.get("picture")))
        st.button("", icon=":material/visibility_off:" if hide_values else ":material/visibility:",
                  key="toggle_values", on_click=toggle_values,
                  help="Mostrar valores" if hide_values else "Esconder valores")

    # No PC, duas colunas: resumo à esquerda e últimos lançamentos à direita.
    # No celular, o Streamlit empilha as colunas, uma embaixo da outra.
    st.html(ui.wide_layout())
    col_summary, col_recent = st.columns(2, gap="large")

    with col_summary:
        month_navigation()
        totals = db.month_totals(engine, owner, start, end)
        st.html(ui.balance_hero(
            label="Sobrou no mês",
            balance=fmt(totals[db.INCOME] - totals[db.EXPENSE]),
            income=fmt(totals[db.INCOME]),
            expense=fmt(totals[db.EXPENSE]),
        ))
        goal = db.get_goal(engine, owner)
        if goal and month_offset == 0 and not hide_values:
            st.html(ui.goal_bar(totals[db.EXPENSE], goal, to_brl))

        by_category = db.expenses_by_category(engine, owner, start, end)
        if by_category:
            st.html(ui.category_breakdown(by_category, totals[db.EXPENSE], CATEGORIES, theme, fmt))

    with col_recent:
        recent = db.list_transactions(engine, owner, start, end)[:5]
        if recent:
            st.html('<div class="nf-section-title">Últimos lançamentos</div>')
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
    st.subheader("Extrato")
    month_navigation()
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
        st.markdown("**:material/flag: Meta do mês**")
        st.caption("Quanto você quer gastar, no máximo, por mês. Aparece no Início.")
        current_goal = db.get_goal(engine, owner)
        with st.form("goal", border=False):
            goal_value = st.number_input(
                "Meta (R$)",
                min_value=0.0,
                step=50.0,
                format="%.2f",
                value=current_goal / 100 if current_goal else None,
                placeholder="Ex.: 1500,00",
            )
            if st.form_submit_button("Salvar meta", icon=":material/check:", width="stretch"):
                # Deixar em branco (ou zero) apaga a meta
                db.set_goal(engine, owner, to_cents(goal_value) if goal_value else None)
                st.toast("Meta salva!" if goal_value else "Meta removida.", icon=":material/flag:")

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
