// Gastos por dia do mês: uma barrinha por dia. Os dias que ainda não chegaram ficam apagados.
import { isoDate } from "@/lib/money";

export function DailyChart({
  byDay,
  month,
  today,
  fmt,
}: {
  byDay: Map<string, number>;
  month: Date;
  today: Date;
  fmt: (cents: number) => string;
}) {
  const daysInMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), i + 1));
    return { n: i + 1, total: byDay.get(isoDate(day)) ?? 0, future: day > today, isToday: day.getTime() === today.getTime() };
  });
  const max = Math.max(...days.map((d) => d.total), 1);
  const biggest = days.reduce((a, b) => (b.total > a.total ? b : a));

  return (
    <section aria-label="Gastos por dia">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-bold">Gastos por dia</h2>
        {biggest.total > 0 && <p className="text-sm text-muted">Maior: dia {biggest.n} · {fmt(biggest.total)}</p>}
      </div>
      <div className="flex h-24 items-end gap-[3px] rounded-2xl bg-card p-3">
        {days.map((d) => (
          <div key={d.n} className="flex h-full flex-1 items-end" title={`Dia ${d.n}: ${fmt(d.total)}`}>
            <div
              className={`w-full rounded-t-[3px] ${d.isToday ? "bg-primary" : d.future ? "bg-line/50" : "bg-primary/45"}`}
              style={{ height: d.total > 0 ? `${Math.max((d.total / max) * 100, 6)}%` : "3px" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between px-3 text-sm text-muted">
        <span>1</span>
        <span>{Math.ceil(daysInMonth / 2)}</span>
        <span>{daysInMonth}</span>
      </div>
    </section>
  );
}
