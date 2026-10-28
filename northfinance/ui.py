"""Visual do app: estilos (CSS) e pedaços de tela em HTML.

O Streamlit tem um visual de "painel de dados". Para o NorthFinance parecer
um app de celular, trocamos parte desse visual com CSS.
"""

import base64
from html import escape
from pathlib import Path

# A logo vai como imagem embutida no próprio HTML (o "data URI"),
# porque o Streamlit remove desenhos SVG colocados direto na página.
_LOGO_BYTES = (Path(__file__).resolve().parent.parent / "assets" / "logo.svg").read_bytes()
LOGO_IMG = f'<img src="data:image/svg+xml;base64,{base64.b64encode(_LOGO_BYTES).decode()}" alt="NorthFinance">'

# Cores para o tema claro e para o escuro (o app segue o tema do celular)
PALETTES = {
    "light": {
        "surface": "#ffffff",
        "card": "#f3f5f7",
        "border": "#e4e7eb",
        "muted": "#667085",
        "income": "#15803d",
        "expense": "#d92d20",
    },
    "dark": {
        "surface": "#0e1117",
        "card": "#1a1e26",
        "border": "#2a303b",
        "muted": "#98a2b3",
        "income": "#4ade80",
        "expense": "#f97066",
    },
}
GRADIENT = "linear-gradient(45deg, #1e4fd6, #22c55e)"


def styles(theme: str) -> str:
    c = PALETTES[theme]
    return f"""
<style>
/* Esconde o cabeçalho padrão do Streamlit e deixa a página com largura de celular */
header[data-testid="stHeader"] {{ display: none; }}
[data-testid="stMainBlockContainer"] {{ padding: 1.25rem 1rem 10rem; max-width: 520px; }}

/* Marca no topo */
.nf-brand {{ display: flex; align-items: center; gap: 10px; }}
.nf-brand img {{ width: 36px; height: 36px; flex: none; }}
.nf-brand span {{ font-size: 1.3rem; letter-spacing: -0.3px; }}
.nf-brand b {{ font-weight: 800; }}

/* Tela de entrada */
.nf-welcome {{ display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; margin: 2rem 0 1.5rem; }}
.nf-welcome img {{ width: 96px; height: 96px; margin-bottom: 8px; }}
.nf-welcome h1 {{ font-size: 1.8rem; margin: 0; padding: 0; letter-spacing: -0.5px; }}
.nf-welcome p {{ color: {c["muted"]}; margin: 0; }}

/* Cartões de ganhos, gastos e saldo */
.nf-cards {{ display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }}
.nf-card {{ background: {c["card"]}; border-radius: 16px; padding: 14px 16px; }}
.nf-card .label {{ font-size: 0.8rem; color: {c["muted"]}; }}
.nf-card .value {{ font-size: 1.2rem; font-weight: 700; }}
.nf-card.balance {{ grid-column: span 2; background: {GRADIENT}; color: #fff; }}
.nf-card.balance .label {{ color: rgba(255, 255, 255, 0.85); }}
.nf-card.balance .value {{ font-size: 1.7rem; }}
.income {{ color: {c["income"]}; }}
.expense {{ color: {c["expense"]}; }}

/* Linhas do extrato */
.nf-day {{ font-size: 0.75rem; font-weight: 700; color: {c["muted"]}; text-transform: uppercase;
          letter-spacing: 0.5px; margin: 0.75rem 0 0.25rem; }}
.nf-row {{ display: flex; align-items: center; gap: 12px; padding: 6px 0; }}
.nf-icon {{ width: 40px; height: 40px; border-radius: 50%; background: {c["card"]}; flex: none;
           display: flex; align-items: center; justify-content: center; font-size: 1.15rem; }}
.nf-row .text {{ flex: 1; min-width: 0; }}
.nf-row .title {{ font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }}
.nf-row .sub {{ font-size: 0.8rem; color: {c["muted"]}; }}
.nf-row .amount {{ font-weight: 600; white-space: nowrap; }}
[class*="st-key-tx-"] {{ flex-wrap: nowrap !important; align-items: center !important; }}

/* Barra de navegação fixa embaixo, como num app */
/* Ela "flutua" acima do rodapé: no celular, o Streamlit Cloud coloca uns selos
   no canto de baixo da tela, que ficariam por cima dos botões. */
.st-key-bottom_nav {{
  position: fixed; left: 50%; transform: translateX(-50%); z-index: 1000;
  bottom: calc(60px + env(safe-area-inset-bottom));
  width: calc(100% - 24px); max-width: 520px;
  background: {c["surface"]}; border: 1px solid {c["border"]}; border-radius: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 6px 8px;
  flex-wrap: nowrap !important; justify-content: space-around !important;
}}
.st-key-bottom_nav > div {{ flex: 1 1 0; min-width: 0; }}
.st-key-bottom_nav button {{ width: 100%; padding: 6px 2px; min-height: 52px; }}
.st-key-bottom_nav button p {{ font-size: 0.72rem; }}
.st-key-bottom_nav button > div, .st-key-bottom_nav button > span {{ flex-direction: column; gap: 2px; }}
/* No computador os selos ficam longe, no canto direito: a barra pode descer */
@media (min-width: 560px) {{
  .st-key-bottom_nav {{ bottom: 12px; }}
}}

</style>
"""


def brand() -> str:
    return f'<div class="nf-brand">{LOGO_IMG}<span><b>North</b>Finance</span></div>'


def welcome() -> str:
    return f"""
<div class="nf-welcome">
  {LOGO_IMG}
  <h1><b>North</b>Finance</h1>
  <p>O app de finanças mais simples que existe.</p>
</div>"""


def summary_cards(income: str, expense: str, balance: str) -> str:
    return f"""
<div class="nf-cards">
  <div class="nf-card balance"><div class="label">Sobrou no mês</div><div class="value">{balance}</div></div>
  <div class="nf-card"><div class="label">Ganhos do mês</div><div class="value income">{income}</div></div>
  <div class="nf-card"><div class="label">Gastos do mês</div><div class="value expense">{expense}</div></div>
</div>"""


def split_category(category: str) -> tuple[str, str]:
    """"🛒 Mercado" vira ("🛒", "Mercado")."""
    icon, _, name = category.partition(" ")
    return icon, name or category


def day_header(label: str) -> str:
    return f'<div class="nf-day">{escape(label)}</div>'


def transaction_row(category: str, description: str | None, amount: str, kind: str) -> str:
    """Uma linha do extrato: ícone redondo, nome, categoria e valor colorido."""
    icon, name = split_category(category)
    title = escape(description) if description else escape(name)
    sign = "+" if kind == "income" else "-"
    return f"""
<div class="nf-row">
  <div class="nf-icon">{icon}</div>
  <div class="text"><div class="title">{title}</div><div class="sub">{escape(name)}</div></div>
  <div class="amount {kind}">{sign} {amount}</div>
</div>"""
