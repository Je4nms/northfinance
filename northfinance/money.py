"""Conversões de dinheiro e datas para o jeito brasileiro."""

from datetime import date

MONTHS = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
]


def to_cents(value: float) -> int:
    """12.5 vira 1250."""
    return round(value * 100)


def to_brl(cents: int) -> str:
    """1234567 vira "R$ 12.345,67"."""
    reais, centavos = divmod(abs(cents), 100)
    sign = "-" if cents < 0 else ""
    return f"{sign}R$ {reais:,}".replace(",", ".") + f",{centavos:02d}"


def month_name(day: date) -> str:
    """date(2026, 10, 5) vira "Outubro de 2026"."""
    return f"{MONTHS[day.month - 1].capitalize()} de {day.year}"


def month_range(day: date) -> tuple[date, date]:
    """Primeiro dia do mês e primeiro dia do mês seguinte."""
    start = day.replace(day=1)
    end = date(start.year + start.month // 12, start.month % 12 + 1, 1)
    return start, end
