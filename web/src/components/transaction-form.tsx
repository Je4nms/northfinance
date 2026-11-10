"use client";
// Formulário de lançamento: o mesmo para Anotar (novo) e Editar (já existente)
import { CalendarClock, Check, Repeat, Trash2 } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { addBill, addTransaction, deleteBill, updateTransaction, type FormState } from "@/app/actions";
import { CategoryGlyph, CategoryIcon } from "@/components/category-icon";
import { categoryName, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import { haptic } from "@/lib/haptic";
import { toBRL } from "@/lib/money";

type Initial = { kind: "expense" | "income"; amount: string; category: string; description: string; date: string };
type Kind = "expense" | "income" | "bill";
export type BillItem = { id: number; name: string; amountCents: number; category: string; dueDay: number };

const KINDS: { value: Kind; label: string }[] = [
  { value: "expense", label: "Gasto" },
  { value: "income", label: "Ganho" },
  { value: "bill", label: "Conta" },
];

/**
 * Formulário do Anotar (Gasto, Ganho ou Conta a vencer) e do Editar (só Gasto ou Ganho).
 * "Conta" guarda uma conta que vence todo mês: o app avisa antes, e você confirma quando pagar.
 */
export function TransactionForm({ today, editId, initial, startKind, bills = [] }: {
  today: string; editId?: number; initial?: Initial; startKind?: Kind; bills?: BillItem[];
}) {
  const [kind, setKind] = useState<Kind>(initial?.kind ?? startKind ?? "expense");
  const [celebrate, setCelebrate] = useState(false);
  const isBill = kind === "bill";
  const save = editId ? updateTransaction.bind(null, editId) : isBill ? addBill : addTransaction;
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await save(prev, form);
    if (result.ok) {
      (document.getElementById("transaction-form") as HTMLFormElement)?.reset();
      haptic();
      setCelebrate(true);
    }
    return result;
  }, {});

  useEffect(() => {
    if (!celebrate) return;
    const timer = setTimeout(() => setCelebrate(false), 1400);
    return () => clearTimeout(timer);
  }, [celebrate]);

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const kinds = editId ? KINDS.filter((k) => k.value !== "bill") : KINDS;

  return (
    <>
      <form id="transaction-form" action={action} className="space-y-5">
        <input type="hidden" name="kind" value={kind} />
        <div className={`grid rounded-2xl bg-card p-1 ${kinds.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
          {kinds.map((k) => (
            <button key={k.value} type="button" onClick={() => setKind(k.value)} aria-pressed={kind === k.value}
              className={`rounded-xl py-2.5 font-semibold ${kind === k.value ? "bg-bg shadow-sm" : "text-muted"}`}>
              {k.label}
            </button>
          ))}
        </div>

        {isBill && (
          <p className="flex gap-2.5 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
            <CalendarClock size={18} className="mt-0.5 flex-none text-primary" />
            Contas que vencem todo mês, como luz e internet. O app avisa 3 dias antes e no dia, e você só confirma quando pagar.
          </p>
        )}

        <label className="block">
          <span className="text-sm text-muted">Valor</span>
          <div className="mt-1 flex items-baseline gap-2 border-b-2 border-line pb-1 focus-within:border-primary">
            <span className="text-2xl font-bold text-muted">R$</span>
            <input name="amount" inputMode="decimal" placeholder="0,00" required autoComplete="off" defaultValue={initial?.amount}
              className="w-full bg-transparent text-4xl font-extrabold outline-none" />
          </div>
        </label>

        <fieldset>
          <legend className="mb-2 text-sm text-muted">Categoria</legend>
          <div className="flex flex-wrap gap-2" key={kind}>
            {categories.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="category" value={c} className="peer sr-only" required
                  defaultChecked={isBill ? c === "💡 Contas" : initial?.category === c} />
                <span className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 transition-colors peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:font-semibold">
                  <CategoryGlyph category={c} />
                  {categoryName(c)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {isBill ? (
          <>
            <label className="block">
              <span className="text-sm text-muted">Nome da conta</span>
              <input name="name" maxLength={60} placeholder="Ex.: Luz, Internet, Aluguel" required autoComplete="off"
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
            </label>
            <label className="block">
              <span className="text-sm text-muted">Vence todo dia</span>
              <input name="dueDay" type="number" inputMode="numeric" min={1} max={31} placeholder="Ex.: 10" required
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
            </label>
          </>
        ) : (
          <>
            <label className="block">
              <span className="text-sm text-muted">Descrição (opcional)</span>
              <input name="description" maxLength={100} placeholder="Ex.: feira do mês" defaultValue={initial?.description}
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
            </label>

            <label className="block">
              <span className="text-sm text-muted">Data</span>
              <input name="date" type="date" defaultValue={initial?.date ?? today} max={today} required
                className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
            </label>
          </>
        )}

        {!editId && !isBill && (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-4">
            <Repeat size={20} className="flex-none text-primary" />
            <span className="flex-1">
              <span className="block font-semibold">Repetir todo mês</span>
              <span className="text-sm text-muted">Para valores que não mudam, como assinaturas: o app lança sozinho no mesmo dia.</span>
            </span>
            <input type="checkbox" name="repeat" className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        )}

        {state.error && <p role="alert" className="font-semibold text-expense">{state.error}</p>}
        {state.ok && !celebrate && <p className="font-semibold text-income">{state.ok}</p>}

        <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
          {pending ? "Salvando..." : editId ? "Salvar alterações" : isBill ? "Salvar conta" : "Salvar"}
        </button>
      </form>

      {isBill && bills.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Suas contas</h2>
          <ul className="mt-1 divide-y divide-line">
            {bills.map((b) => (
              <li key={b.id} className="flex items-center gap-3 py-2.5">
                <CategoryIcon category={b.category} size={38} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{b.name}</p>
                  <p className="text-sm text-muted">Todo dia {b.dueDay} · {toBRL(b.amountCents)}</p>
                </div>
                <form action={deleteBill.bind(null, b.id)}>
                  <button aria-label={`Apagar a conta ${b.name}`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-expense">
                    <Trash2 size={18} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Confirmação animada: um ✓ verde que aparece e some */}
      {celebrate && (
        <div role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center">
          <div className="nf-pop flex flex-col items-center gap-3 rounded-3xl bg-bg/95 px-8 py-6 shadow-2xl ring-1 ring-line">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-income text-white">
              <Check size={36} strokeWidth={3} className="nf-check" />
            </span>
            <p className="font-bold">{state.ok}</p>
          </div>
        </div>
      )}
    </>
  );
}
