// Lista estilo extrato, separada por dia ("Hoje", "Ontem", "25 de outubro").
// Tocar num lançamento abre a tela de editar. O dinheiro anotado nas Metas aparece junto, com cor neutra.
import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { CategoryIcon } from "@/components/category-icon";
import { GoalIcon } from "@/components/goal-icon";
import { categoryName } from "@/lib/categories";
import type { GoalEntry, Transaction } from "@/lib/db";
import { dayLabel, isoDate } from "@/lib/money";

type Item = { type: "transaction"; t: Transaction } | { type: "saved"; e: GoalEntry };

export function TransactionList({
  transactions,
  saved = [],
  today,
  fmt,
}: {
  transactions: Transaction[];
  saved?: GoalEntry[];
  today: Date;
  fmt: (cents: number) => string;
}) {
  const items: Item[] = [
    ...transactions.map((t) => ({ type: "transaction" as const, t })),
    ...saved.map((e) => ({ type: "saved" as const, e })),
  ];
  const dayOf = (i: Item) => isoDate(i.type === "transaction" ? i.t.occurredOn : i.e.occurredOn);
  items.sort((a, b) => dayOf(b).localeCompare(dayOf(a)));
  const days = new Map<string, Item[]>();
  for (const i of items) days.set(dayOf(i), [...(days.get(dayOf(i)) ?? []), i]);

  return (
    <div className="space-y-1">
      {[...days.entries()].map(([key, items]) => (
        <section key={key}>
          <h3 className="mt-4 mb-1 text-sm font-bold tracking-wide text-muted uppercase">
            {dayLabel(new Date(key + "T00:00:00Z"), today)}
          </h3>
          <ul>
            {items.map((item) => {
              if (item.type === "saved") {
                const e = item.e;
                return (
                  <li key={`saved-${e.id}`}>
                    <Link href="/metas" className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-card active:bg-card">
                      <GoalIcon icon={e.goalIcon} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{e.goalName}</p>
                        <p className="text-sm text-muted">{e.amountCents > 0 ? "Guardado na meta" : "Tirado da meta"}</p>
                      </div>
                      <p className="font-semibold whitespace-nowrap text-muted">
                        {e.amountCents > 0 ? "" : "+ "}{fmt(Math.abs(e.amountCents))}
                      </p>
                      <ChevronRight size={18} className="flex-none text-muted" />
                    </Link>
                  </li>
                );
              }
              const t = item.t;
              const name = categoryName(t.category);
              return (
                <li key={t.id}>
                  <Link href={`/lancamento/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 transition-colors hover:bg-card active:bg-card">
                    <CategoryIcon category={t.category} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{t.description || name}</p>
                      <p className="text-sm text-muted">{name}</p>
                    </div>
                    <p className={`font-semibold whitespace-nowrap ${t.kind === "income" ? "text-income" : "text-expense"}`}>
                      {t.kind === "income" ? "+" : "-"} {fmt(t.amountCents)}
                    </p>
                    <ChevronRight size={18} className="flex-none text-muted" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
