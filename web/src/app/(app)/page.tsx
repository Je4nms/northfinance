// Início: saudação, saldo do mês, meta, para onde foi o dinheiro e últimos lançamentos
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { answerEnjoying, saveGoal, toggleValues } from "@/app/actions";
import { TransactionList } from "@/components/transaction-list";
import { categoryColor, splitCategory } from "@/lib/categories";
import * as db from "@/lib/db";
import { greeting, monthName, monthParam, monthRange, parseMonth, shiftMonth, todayInSaoPaulo, toBRL } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<Loading />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
}

function Loading() {
  return <div className="flex h-[60dvh] items-center justify-center"><img src="/logo.svg" alt="" className="h-14 w-14 animate-pulse" /></div>;
}

async function Home({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const member = await currentMember();
  const params = await searchParams;
  const hide = (await cookies()).get("nf-hide")?.value === "1";
  const fmt = (cents: number) => (hide ? "R$ •••••" : toBRL(cents));

  const today = todayInSaoPaulo();
  const month = parseMonth(typeof params.mes === "string" ? params.mes : undefined, today);
  const isCurrentMonth = month.getTime() === shiftMonth(today, 0).getTime();
  const [start, end] = monthRange(month);

  const [totals, byCategory, recent, goal, askEnjoying] = await Promise.all([
    db.monthTotals(member.email, start, end),
    db.expensesByCategory(member.email, start, end),
    db.listTransactions(member.email, start, end),
    db.getGoal(member.email),
    db.shouldAskEnjoying(member.email),
  ]);
  const balance = totals.income - totals.expense;

  return (
    <div className="space-y-5">
      {/* Topo: foto, saudação e o olho que esconde os valores */}
      <header className="flex items-center gap-3.5">
        {member.image ? (
          <img src={member.image} alt="" referrerPolicy="no-referrer" className="h-13 w-13 rounded-full object-cover ring-3 ring-white/15" />
        ) : (
          <span className="flex h-13 w-13 items-center justify-center rounded-full bg-gradient-to-tr from-[#1e4fd6] to-[#22c55e] text-xl font-bold text-white">
            {member.firstName[0]?.toUpperCase()}
          </span>
        )}
        <p className="flex-1 text-2xl leading-tight tracking-tight">
          {greeting()},<br />
          <b className="font-extrabold">{member.firstName}</b>
        </p>
        <form action={toggleValues}>
          <button aria-label={hide ? "Mostrar valores" : "Esconder valores"} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-bg/60 backdrop-blur">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              {hide ? <path d="M3 3l18 18" /> : <circle cx="12" cy="12" r="3" />}
            </svg>
          </button>
        </form>
      </header>

      {askEnjoying && (
        <section className="rounded-3xl border border-line bg-card/70 p-4 backdrop-blur">
          <p className="font-bold">Está curtindo o NorthFinance?</p>
          <p className="text-sm text-muted">A sua opinião ajuda a deixar o app melhor.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={answerEnjoying.bind(null, "sim")}><button className="rounded-full bg-primary px-4 py-2 font-semibold text-white">Sim! 😍</button></form>
            <form action={answerEnjoying.bind(null, "sugestao")}><button className="rounded-full border border-line px-4 py-2 font-semibold">Tenho uma sugestão</button></form>
            <form action={answerEnjoying.bind(null, "agora_nao")}><button className="px-3 py-2 text-muted">Agora não</button></form>
          </div>
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          {/* Troca de mês */}
          <nav className="flex items-center justify-center gap-4 font-bold">
            <Link href={`/?mes=${monthParam(shiftMonth(month, -1))}`} aria-label="Mês anterior" className="rounded-full px-3 py-1 text-muted">‹</Link>
            <span>{monthName(month)}</span>
            {isCurrentMonth ? (
              <span className="px-3 py-1 text-muted/30">›</span>
            ) : (
              <Link href={`/?mes=${monthParam(shiftMonth(month, 1))}`} aria-label="Próximo mês" className="rounded-full px-3 py-1 text-muted">›</Link>
            )}
          </nav>

          <section>
            <p className="text-sm text-muted">Sobrou no mês</p>
            <p className="text-5xl leading-tight font-extrabold tracking-tight">{fmt(balance)}</p>
          </section>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-3xl bg-card p-4">
              <p className="text-sm text-muted">Ganhos</p>
              <p className="text-xl font-bold text-income">{fmt(totals.income)}</p>
            </div>
            <div className="rounded-3xl bg-card p-4">
              <p className="text-sm text-muted">Gastos</p>
              <p className="text-xl font-bold text-expense">{fmt(totals.expense)}</p>
            </div>
          </div>

          {isCurrentMonth && !hide && <Goal spent={totals.expense} goal={goal} />}

          {byCategory.length > 0 && (
            <section>
              <h2 className="mb-2.5 font-bold">Para onde foi o dinheiro</h2>
              <div className="flex h-3.5 gap-0.5 overflow-hidden rounded-full">
                {byCategory.map((c) => (
                  <span key={c.category} style={{ flex: c.totalCents, background: categoryColor(c.category) }} className="min-w-1" />
                ))}
              </div>
              <ul className="mt-3 divide-y divide-line">
                {byCategory.map((c) => (
                  <li key={c.category} className="flex items-center gap-2.5 py-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(c.category) }} />
                    <span className="flex-1">{splitCategory(c.category)[1]}</span>
                    <span className="text-sm text-muted">{Math.round((c.totalCents / totals.expense) * 100)}%</span>
                    <span className="min-w-24 text-right font-semibold">{fmt(c.totalCents)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <section>
          <h2 className="font-bold">Últimos lançamentos</h2>
          {recent.length > 0 ? (
            <TransactionList transactions={recent.slice(0, 5)} today={today} fmt={fmt} />
          ) : (
            <p className="mt-3 rounded-3xl bg-card p-4 text-muted">
              Nada anotado neste mês ainda. Toque em <b>Anotar</b> para começar.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

/** Meta do mês: barra verde até 80%, laranja até 100%, vermelha quando passa. Editável ali mesmo. */
function Goal({ spent, goal }: { spent: number; goal: number | null }) {
  const editor = (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
        {goal ? "Editar meta" : "🎯 Definir uma meta para o mês"}
      </summary>
      <form action={saveGoal} className="mt-3 flex gap-2">
        <input
          name="goal"
          inputMode="decimal"
          placeholder="Ex.: 1500,00"
          defaultValue={goal ? (goal / 100).toFixed(2).replace(".", ",") : ""}
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg px-3 py-2"
        />
        <button className="rounded-xl bg-primary px-4 py-2 font-semibold text-white">Salvar</button>
      </form>
      <p className="mt-1 text-xs text-muted">Deixe em branco para tirar a meta.</p>
    </details>
  );

  if (!goal) return <div className="rounded-3xl border border-dashed border-line p-4">{editor}</div>;

  const share = spent / goal;
  const color = share < 0.8 ? "bg-income" : share <= 1 ? "bg-warning" : "bg-expense";
  const note = share <= 1 ? `Faltam ${toBRL(goal - spent)}` : `Passou ${toBRL(spent - goal)} da meta`;
  return (
    <div className="space-y-2 rounded-3xl bg-card p-4">
      <div className="flex justify-between text-sm text-muted">
        <span>Meta do mês</span>
        <span>{toBRL(spent)} de {toBRL(goal)} ({Math.round(share * 100)}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(share, 1) * 100}%` }} />
      </div>
      <p className={`text-sm font-semibold ${share < 0.8 ? "" : share <= 1 ? "text-warning" : "text-expense"}`}>{note}</p>
      {editor}
    </div>
  );
}
