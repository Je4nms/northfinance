// Metas: a pessoa anota quanto guardou para cada sonho e vê quanto falta.
// O NorthFinance não guarda nem movimenta dinheiro: o dinheiro fica no banco da pessoa.
import { cookies } from "next/headers";
import { Suspense } from "react";

import { Brand } from "@/components/brand";
import { LoadingLogo } from "@/components/loading-logo";
import { MetasClient } from "@/components/metas-client";
import * as db from "@/lib/db";
import { isoDate, monthRange, shiftMonth, todayInSaoPaulo } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page() {
  return (
    <div className="nf-fade-in space-y-5">
      <Brand />
      <h1 className="text-3xl font-extrabold tracking-tight">Metas</h1>
      <Suspense fallback={<LoadingLogo />}>
        <Metas />
      </Suspense>
    </div>
  );
}

async function Metas() {
  const member = await currentMember();
  const hide = (await cookies()).get("nf-hide")?.value === "1";
  const today = todayInSaoPaulo();
  const [start, end] = monthRange(today);
  const tomorrow = new Date(today.getTime() + 86_400_000);

  const [ready, goals, entries, monthSaved, average] = await Promise.all([
    db.goalsReady(),
    db.listGoals(member.email),
    db.listGoalEntries(member.email, new Date(Date.UTC(2000, 0, 1)), tomorrow),
    db.savedBetween(member.email, start, end),
    db.averageMonthlyExpense(member.email, shiftMonth(today, -3), shiftMonth(today, 0)),
  ]);

  // Dica da reserva de emergência: 6 meses do gasto médio, arredondado para R$ 100
  const hasReserve = goals.some((g) => g.icon === "reserva");
  const reserveHint = !hasReserve && average ? Math.round((average * 6) / 10_000) * 10_000 : null;

  return (
    <MetasClient
      ready={ready}
      hide={hide}
      today={isoDate(today)}
      monthSaved={monthSaved}
      reserveHint={reserveHint}
      goals={goals.map((g) => ({
        ...g,
        entries: entries.filter((e) => e.goalId === g.id).map((e) => ({ id: e.id, amountCents: e.amountCents, day: isoDate(e.occurredOn) })),
      }))}
    />
  );
}
