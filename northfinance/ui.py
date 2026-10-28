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

# Versão animada da logo, só para a tela de entrada: o marcador do norte (o triângulo
# do topo) dá uma volta na bússola e para apontando para o norte. A animação fica
# dentro do próprio desenho, e quem ativou "reduzir movimento" no celular vê ela parada.
_NEEDLE = '<polygon points="100,22 116,48 84,48" fill="#fff"/>'
_ANIMATED_LOGO = (
    _LOGO_BYTES.decode()
    .replace(_NEEDLE, f'<g class="needle">{_NEEDLE}</g>')
    .replace(
        "</defs>",
        """</defs>
  <style>
    .needle { transform-box: view-box; transform-origin: 100px 104px;
              animation: find-north 1.6s cubic-bezier(.2, .8, .2, 1) .2s both; }
    @keyframes find-north { from { transform: rotate(-300deg); } to { transform: rotate(0deg); } }
    @media (prefers-reduced-motion: reduce) { .needle { animation: none; } }
  </style>""",
    )
)
LOGO_ANIMATED_IMG = (
    f'<img src="data:image/svg+xml;base64,{base64.b64encode(_ANIMATED_LOGO.encode()).decode()}" alt="NorthFinance">'
)

# Cores para o tema claro e para o escuro (o app segue o tema do celular)
PALETTES = {
    "light": {
        "surface": "#ffffff",
        "card": "#f3f5f7",
        "border": "#e4e7eb",
        "muted": "#667085",
        "income": "#15803d",
        "expense": "#d92d20",
        "aurora": 0.45,
    },
    "dark": {
        "surface": "#0e1117",
        "card": "#1a1e26",
        "border": "#2a303b",
        "muted": "#98a2b3",
        "income": "#4ade80",
        "expense": "#f97066",
        "aurora": 0.55,
    },
}
GRADIENT = "linear-gradient(45deg, #1e4fd6, #22c55e)"


def styles(theme: str) -> str:
    c = PALETTES[theme]
    return f"""
<style>
/* Esconde o cabeçalho padrão do Streamlit e deixa a página com largura de celular */
header[data-testid="stHeader"] {{ display: none; }}
[data-testid="stMainBlockContainer"] {{ padding: 1.25rem 1rem 7rem; max-width: 520px; }}

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

.nf-footer {{ text-align: center; font-size: 0.8rem; margin-top: 1rem; }}
.nf-footer a {{ color: {c["muted"]}; }}


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

/* Barra de navegação fixa embaixo, como num app.
   Para os selos do Streamlit Cloud não ficarem por cima dela, o app é aberto
   pelo link com "?embed=true" no final, que esconde esses selos. */
.st-key-bottom_nav {{
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 1000;
  background: {c["surface"]}; border-top: 1px solid {c["border"]};
  padding: 6px 8px calc(8px + env(safe-area-inset-bottom));
  flex-wrap: nowrap !important; justify-content: space-around !important;
}}
.st-key-bottom_nav > div {{ flex: 1 1 0; min-width: 0; }}
.st-key-bottom_nav button {{ width: 100%; padding: 6px 2px; min-height: 52px; }}
.st-key-bottom_nav button p {{ font-size: 0.72rem; }}
.st-key-bottom_nav button > div, .st-key-bottom_nav button > span {{ flex-direction: column; gap: 2px; }}

/* No computador, a barra fica do tamanho do conteúdo, centralizada e "flutuando" */
@media (min-width: 560px) {{
  .st-key-bottom_nav {{
    left: 50%; right: auto; transform: translateX(-50%); bottom: 12px;
    width: 100%; max-width: 520px; padding: 6px 8px;
    border: 1px solid {c["border"]}; border-radius: 18px; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }}
}}

</style>
"""


def brand() -> str:
    return f'<div class="nf-brand">{LOGO_IMG}<span><b>North</b>Finance</span></div>'


def welcome(theme: str) -> str:
    """Tela de entrada: logo animada e o fundo "aurora" (luz do norte) se mexendo devagar."""
    return aurora(theme) + f"""
<div class="nf-welcome">
  {LOGO_ANIMATED_IMG}
  <h1><b>North</b>Finance</h1>
  <p>O app de finanças mais simples que existe.</p>
</div>"""


def wide_layout() -> str:
    """No computador, deixa a página mais larga (usado no Início, que tem duas colunas)."""
    return """<style>
@media (min-width: 900px) {
  [data-testid="stMainBlockContainer"] { max-width: 960px; }
}
</style>"""


def aurora(theme: str) -> str:
    """Fundo "aurora" da tela de entrada: luzes azul e verde, bem suaves, se mexendo devagar.

    É desenhado no fundo da página (atrás de tudo), e só existe na tela de entrada.
    Quem ativou "reduzir movimento" no celular vê o fundo parado.
    """
    a = PALETTES[theme]["aurora"]
    return f"""<style>
[data-testid="stAppViewContainer"]::before {{
  content: ""; position: fixed; inset: -20vmax; z-index: 0; pointer-events: none;
  background:
    radial-gradient(closest-side, rgba(30, 79, 214, {a}), transparent) 15% 10% / 75vmax 75vmax no-repeat,
    radial-gradient(closest-side, rgba(34, 197, 94, {a}), transparent) 85% 90% / 85vmax 85vmax no-repeat,
    radial-gradient(closest-side, rgba(20, 184, 166, {a * 0.7:.2f}), transparent) 60% 55% / 55vmax 55vmax no-repeat;
  animation: nf-aurora 18s ease-in-out infinite alternate;
}}
[data-testid="stMain"] {{ position: relative; z-index: 1; }}
@keyframes nf-aurora {{
  0%   {{ transform: translate(0, 0) rotate(0deg) scale(1); }}
  50%  {{ transform: translate(6vmax, 4vmax) rotate(8deg) scale(1.08); }}
  100% {{ transform: translate(-5vmax, 7vmax) rotate(-6deg) scale(0.96); }}
}}
@media (prefers-reduced-motion: reduce) {{
  [data-testid="stAppViewContainer"]::before {{ animation: none; }}
}}
</style>"""


def privacy_link() -> str:
    return '<p class="nf-footer"><a href="?pagina=privacidade" target="_blank">Política de Privacidade</a></p>'


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
