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


def day_label(day: date, today: date) -> str:
    """Rótulo do dia no extrato: "Hoje", "Ontem" ou "25 de outubro"."""
    if day == today:
        return "Hoje"
    if (today - day).days == 1:
        return "Ontem"
    return f"{day.day} de {MONTHS[day.month - 1]}"


def shift_month(day: date, months: int) -> date:
    """Primeiro dia do mês, andando `months` meses (negativo = para trás)."""
    index = day.year * 12 + day.month - 1 + months
    return date(index // 12, index % 12 + 1, 1)


def greeting(hour: int) -> str:
    """Saudação conforme a hora do dia."""
    if 5 <= hour < 12:
        return "Bom dia"
    if 12 <= hour < 18:
        return "Boa tarde"
    return "Boa noite"
