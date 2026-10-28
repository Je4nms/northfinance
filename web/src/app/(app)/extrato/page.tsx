// Extrato: por mês (com as setas) ou por datas escolhidas, com filtro de ganhos e gastos.
// Tudo fica no endereço (ex.: /extrato?de=2026-09-28&ate=2026-09-28&tipo=expense),
// então dá para voltar, atualizar a página ou mandar o link.
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";

import { Brand } from "@/components/brand";
import { TransactionList } from "@/components/transaction-list";
import * as db from "@/lib/db";
import { isoDate, monthName, monthParam, monthRange, parseMonth, shiftMonth, todayInSaoPaulo, toBRL } from "@/lib/money";
import { currentMember } from "@/lib/session";

type Params = Record<string, string | string[] | undefined>;

export default function Page({ searchParams }: PageProps<"/extrato">) {
  return (
    <div className="space-y-4">
      <Brand />
      <h1 className="text-3xl font-extrabold tracking-tight">Extrato</h1>
      <Suspense>
        <Statement searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function link(params: Params, changes: Params): string {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...params, ...changes })) if (typeof v === "string" && v) next.set(k, v);
  const query = next.toString();
  return query ? `/extrato?${query}` : "/extrato";
}

function parseDay(value: unknown): Date | null {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + "T00:00:00Z") : null;
}

const pill = (active: boolean) =>
  `rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-primary text-white" : "border border-line"}`;

async function Statement({ searchParams }: { searchParams: Promise<Params> }) {
  const member = await currentMember();
  const params = await searchParams;
  const hide = (await cookies()).get("nf-hide")?.value === "1";
  const fmt = (cents: number) => (hide ? "R$ •••••" : toBRL(cents));
  const today = todayInSaoPaulo();

  const byDates = params.periodo === "datas";
  const kind = params.tipo === "income" || params.tipo === "expense" ? params.tipo : null;

  let start: Date, end: Date, month: Date | null = null;
  if (byDates) {
    start = parseDay(params.de) ?? shiftMonth(today, 0);
    const last = parseDay(params.ate) ?? today;
    end = new Date(last.getTime() + 86_400_000);
  } else {
    month = parseMonth(typeof params.mes === "string" ? params.mes : undefined, today);
    [start, end] = monthRange(month);
  }

  let transactions = await db.listTransactions(member.email, start, end);
  if (kind) transactions = transactions.filter((t) => t.kind === kind);
  const total = transactions.reduce((sum, t) => sum + (t.kind === "income" ? t.amountCents : -t.amountCents), 0);
  const isCurrentMonth = month?.getTime() === shiftMonth(today, 0).getTime();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 rounded-2xl bg-card p-1 md:max-w-sm">
        <Link href={link({ tipo: params.tipo }, {})} className={`rounded-xl py-2 text-center font-semibold ${!byDates ? "bg-bg shadow-sm" : "text-muted"}`}>Por mês</Link>
        <Link href={link({ tipo: params.tipo }, { periodo: "datas" })} className={`rounded-xl py-2 text-center font-semibold ${byDates ? "bg-bg shadow-sm" : "text-muted"}`}>Escolher datas</Link>
      </div>

      {byDates ? (
        <form className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="periodo" value="datas" />
          {kind && <input type="hidden" name="tipo" value={kind} />}
          <label className="flex-1">
            <span className="text-sm text-muted">De</span>
            <input type="date" name="de" defaultValue={isoDate(start)} max={isoDate(today)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5" />
          </label>
          <label className="flex-1">
            <span className="text-sm text-muted">Até</span>
            <input type="date" name="ate" defaultValue={isoDate(new Date(end.getTime() - 86_400_000))} max={isoDate(today)} className="mt-1 w-full rounded-xl bg-card px-3 py-2.5" />
          </label>
          <button className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-white">Ver</button>
        </form>
      ) : (
        <nav className="flex items-center justify-center gap-4 font-bold">
          <Link href={link(params, { mes: monthParam(shiftMonth(month!, -1)) })} aria-label="Mês anterior" className="px-3 py-1 text-muted">‹</Link>
          <span>{monthName(month!)}</span>
          {isCurrentMonth ? (
            <span className="px-3 py-1 text-muted/30">›</span>
          ) : (
            <Link href={link(params, { mes: monthParam(shiftMonth(month!, 1)) })} aria-label="Próximo mês" className="px-3 py-1 text-muted">›</Link>
          )}
        </nav>
      )}

      <div className="flex gap-2">
        <Link href={link(params, { tipo: undefined })} className={pill(!kind)}>Todos</Link>
        <Link href={link(params, { tipo: "income" })} className={pill(kind === "income")}>Ganhos</Link>
        <Link href={link(params, { tipo: "expense" })} className={pill(kind === "expense")}>Gastos</Link>
      </div>

      {transactions.length > 0 ? (
        <>
          <p className="text-sm text-muted">
            {transactions.length} lançamento(s) · saldo do período: <b className="text-fg">{fmt(total)}</b>
          </p>
          <TransactionList transactions={transactions} today={today} fmt={fmt} allowDelete />
        </>
      ) : (
        <p className="rounded-3xl bg-card p-4 text-muted">Nenhum lançamento nesse período.</p>
      )}
    </div>
  );
}
