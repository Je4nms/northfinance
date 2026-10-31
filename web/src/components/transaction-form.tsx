"use client";
// Formulário de lançamento: o mesmo para Anotar (novo) e Editar (já existente)
import { Check, Repeat } from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import { addTransaction, updateTransaction, type FormState } from "@/app/actions";
import { CategoryGlyph } from "@/components/category-icon";
import { categoryName, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

type Initial = { kind: "expense" | "income"; amount: string; category: string; description: string; date: string };

/**
 * Vibraçãozinha ao salvar. Android: navigator.vibrate. iPhone (iOS 18+): o Safari não deixa
 * sites vibrarem, mas um "interruptor" invisível sendo ligado faz o iPhone dar um toque.
 */
function haptic() {
  try {
    navigator.vibrate?.(30);
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.style.display = "none";
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch {
    // Sem vibração neste aparelho: tudo bem
  }
}

export function TransactionForm({ today, editId, initial }: { today: string; editId?: number; initial?: Initial }) {
  const [kind, setKind] = useState<"expense" | "income">(initial?.kind ?? "expense");
  const [celebrate, setCelebrate] = useState(false);
  const save = editId ? updateTransaction.bind(null, editId) : addTransaction;
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

  const categories = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <>
      <form id="transaction-form" action={action} className="space-y-5">
        <input type="hidden" name="kind" value={kind} />
        <div className="grid grid-cols-2 rounded-2xl bg-card p-1">
          {(["expense", "income"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k}
              className={`rounded-xl py-2.5 font-semibold ${kind === k ? "bg-bg shadow-sm" : "text-muted"}`}>
              {k === "expense" ? "Gasto" : "Ganho"}
            </button>
          ))}
        </div>

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
                  defaultChecked={initial?.category === c} />
                <span className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 transition-colors peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:font-semibold">
                  <CategoryGlyph category={c} />
                  {categoryName(c)}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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

        {!editId && (
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-card p-4">
            <Repeat size={20} className="flex-none text-primary" />
            <span className="flex-1">
              <span className="block font-semibold">Repetir todo mês</span>
              <span className="text-sm text-muted">Para contas fixas: o app lança sozinho no mesmo dia.</span>
            </span>
            <input type="checkbox" name="repeat" className="h-5 w-5 accent-[var(--primary)]" />
          </label>
        )}

        {state.error && <p role="alert" className="font-semibold text-expense">{state.error}</p>}
        {state.ok && !celebrate && <p className="font-semibold text-income">{state.ok}</p>}

        <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white transition-transform active:scale-[0.98] disabled:opacity-60">
          {pending ? "Salvando..." : editId ? "Salvar alterações" : "Salvar"}
        </button>
      </form>

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
