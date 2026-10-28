// Lista estilo extrato, separada por dia ("Hoje", "Ontem", "25 de outubro")
import { deleteTransaction } from "@/app/actions";
import { splitCategory } from "@/lib/categories";
import type { Transaction } from "@/lib/db";
import { dayLabel, isoDate } from "@/lib/money";

export function TransactionList({
  transactions,
  today,
  fmt,
  allowDelete = false,
}: {
  transactions: Transaction[];
  today: Date;
  fmt: (cents: number) => string;
  allowDelete?: boolean;
}) {
  const days = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const key = isoDate(t.occurredOn);
    days.set(key, [...(days.get(key) ?? []), t]);
  }

  return (
    <div className="space-y-1">
      {[...days.entries()].map(([key, items]) => (
        <section key={key}>
          <h3 className="mt-4 mb-1 text-xs font-bold tracking-wider text-muted uppercase">
            {dayLabel(new Date(key + "T00:00:00Z"), today)}
          </h3>
          <ul>
            {items.map((t) => {
              const [icon, name] = splitCategory(t.category);
              return (
                <li key={t.id} className="flex items-center gap-3 py-2">
                  <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-card text-xl">{icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.description || name}</p>
                    <p className="text-sm text-muted">{name}</p>
                  </div>
                  <p className={`font-semibold whitespace-nowrap ${t.kind === "income" ? "text-income" : "text-expense"}`}>
                    {t.kind === "income" ? "+" : "-"} {fmt(t.amountCents)}
                  </p>
                  {allowDelete && (
                    <form action={deleteTransaction.bind(null, t.id)}>
                      <button
                        aria-label="Apagar"
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-card hover:text-expense"
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
                      </button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
