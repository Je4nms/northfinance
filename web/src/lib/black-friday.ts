// Black Friday: sexta depois da 4ª quinta de novembro, até a segunda (Cyber Monday).
// Tudo que é da Black Friday liga e desliga sozinho por esta data: não precisa remover nada depois.
// Datas são "dia sem hora", em UTC, como no resto do app.

const DAY = 86_400_000;

/** Sexta-feira da Black Friday do ano. */
export function blackFridayStart(year: number): Date {
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const firstThursday = 1 + ((4 - nov1.getUTCDay() + 7) % 7);
  return new Date(Date.UTC(year, 10, firstThursday + 21 + 1));
}

/** Se hoje é de sexta a segunda da Black Friday, devolve o dia de início (sexta); senão, null. */
export function blackFridayOf(today: Date): Date | null {
  const start = blackFridayStart(today.getUTCFullYear());
  const days = Math.round((today.getTime() - start.getTime()) / DAY);
  return days >= 0 && days <= 3 ? start : null;
}
