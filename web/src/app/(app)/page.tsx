// Início: saudação, saldo do mês, meta, para onde foi o dinheiro e últimos lançamentos
import { ChevronLeft, ChevronRight, Eye, EyeOff, Target } from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { answerEnjoying, saveGoal, toggleValues } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { LoadingLogo } from "@/components/loading-logo";
import { TransactionList } from "@/components/transaction-list";
import { categoryColor, categoryName } from "@/lib/categories";
import * as db from "@/lib/db";
import { greeting, monthName, monthParam, monthRange, parseMonth, shiftMonth, todayInSaoPaulo, toBRL } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<LoadingLogo fullScreen />}>
      <Home searchParams={searchParams} />
    </Suspense>
  );
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
    <div className="nf-fade-in space-y-5">
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
            {hide ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </form>
      </header>

      {askEnjoying && (
        <section className="rounded-3xl border border-line bg-card/70 p-4 backdrop-blur">
          <p className="font-bold">Está curtindo o NorthFinance?</p>
          <p className="text-sm text-muted">A sua opinião ajuda a deixar o app melhor.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={answerEnjoying.bind(null, "sim")}><button className="rounded-full bg-primary px-4 py-2 font-semibold text-white">Sim, estou curtindo</button></form>
            <form action={answerEnjoying.bind(null, "sugestao")}><button className="rounded-full border border-line px-4 py-2 font-semibold">Tenho uma sugestão</button></form>
            <form action={answerEnjoying.bind(null, "agora_nao")}><button className="px-3 py-2 text-muted">Agora não</button></form>
          </div>
        </section>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-5">
          {/* Troca de mês */}
          <nav className="flex items-center justify-center gap-4 font-bold">
            <Link href={`/?mes=${monthParam(shiftMonth(month, -1))}`} aria-label="Mês anterior" className="rounded-full p-1.5 text-muted hover:bg-card"><ChevronLeft size={20} /></Link>
            <span>{monthName(month)}</span>
            {isCurrentMonth ? (
              <span className="p-1.5 text-muted/30"><ChevronRight size={20} /></span>
            ) : (
              <Link href={`/?mes=${monthParam(shiftMonth(month, 1))}`} aria-label="Próximo mês" className="rounded-full p-1.5 text-muted hover:bg-card"><ChevronRight size={20} /></Link>
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

          {isCurrentMonth && !hide && <Goal spent={totals.expense} goal={goal} today={today} />}

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
                  <li key={c.category} className="flex items-center gap-3 py-2">
                    <CategoryIcon category={c.category} size={36} />
                    <span className="flex-1">{categoryName(c.category)}</span>
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

/**
 * Meta do mês: anel de progresso (verde até 80%, laranja até 100%, vermelho quando passa),
 * quanto ainda dá para gastar, quanto isso dá por dia e a previsão para o fim do mês.
 */
function Goal({ spent, goal, today }: { spent: number; goal: number | null; today: Date }) {
  const editor = (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-primary">
        {goal ? "Editar meta" : "Definir"}
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

  if (!goal) {
    return (
      <div className="flex items-start gap-3 rounded-3xl border border-dashed border-line p-4">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-primary/15 text-primary"><Target size={20} /></span>
        <div className="flex-1">
          <p className="font-bold">Defina uma meta para o mês</p>
          <p className="mb-2 text-sm text-muted">Quanto você quer gastar, no máximo? O app te avisa quando estiver chegando perto.</p>
          {editor}
        </div>
      </div>
    );
  }

  const share = spent / goal;
  const tone = share < 0.8 ? "var(--income)" : share <= 1 ? "var(--warning)" : "var(--expense)";
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const day = today.getUTCDate();
  const daysLeft = daysInMonth - day + 1;
  const left = goal - spent;
  const projection = Math.round((spent / day) * daysInMonth);

  // Anel: um círculo cujo contorno vai "enchendo" conforme o gasto
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const filled = Math.min(share, 1) * circumference;

  return (
    <div className="space-y-4 rounded-3xl bg-card p-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 flex-none">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle cx="40" cy="40" r={radius} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${filled} ${circumference}`} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold">{Math.round(share * 100)}%</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Meta do mês · {toBRL(goal)}</p>
          {left >= 0 ? (
            <>
              <p className="text-2xl leading-tight font-extrabold">{toBRL(left)}</p>
              <p className="text-sm text-muted">ainda dá para gastar</p>
            </>
          ) : (
            <>
              <p className="text-2xl leading-tight font-extrabold text-expense">{toBRL(-left)}</p>
              <p className="text-sm text-muted">acima da meta</p>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-2xl bg-bg/60 p-3">
          <p className="text-muted">Por dia, até o fim do mês</p>
          <p className="font-bold">{left > 0 ? toBRL(Math.floor(left / daysLeft)) : "R$ 0,00"}</p>
        </div>
        <div className="rounded-2xl bg-bg/60 p-3">
          <p className="text-muted">Nesse ritmo, você fecha em</p>
          <p className="font-bold" style={{ color: projection > goal ? "var(--expense)" : undefined }}>{toBRL(projection)}</p>
        </div>
      </div>
      {editor}
    </div>
  );
}
