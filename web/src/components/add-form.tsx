"use client";
// Formulário de anotar: gasto ou ganho, valor, categoria, descrição e data
import { useActionState, useState } from "react";

import { addTransaction, type FormState } from "@/app/actions";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";

export function AddForm({ today }: { today: string }) {
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await addTransaction(prev, form);
    if (result.ok) (document.getElementById("add-form") as HTMLFormElement)?.reset();
    return result;
  }, {});
  const categories = kind === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return (
    <form id="add-form" action={action} className="space-y-5">
      <input type="hidden" name="kind" value={kind} />
      <div className="grid grid-cols-2 rounded-2xl bg-card p-1">
        {(["expense", "income"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`rounded-xl py-2.5 font-semibold ${kind === k ? "bg-bg shadow-sm" : "text-muted"}`}
          >
            {k === "expense" ? "Gasto" : "Ganho"}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm text-muted">Valor</span>
        <div className="mt-1 flex items-baseline gap-2 border-b-2 border-line pb-1 focus-within:border-primary">
          <span className="text-2xl font-bold text-muted">R$</span>
          <input name="amount" inputMode="decimal" placeholder="0,00" required autoComplete="off" className="w-full bg-transparent text-4xl font-extrabold outline-none" />
        </div>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Categoria</legend>
        <div className="flex flex-wrap gap-2" key={kind}>
          {categories.map((c) => (
            <label key={c} className="cursor-pointer">
              <input type="radio" name="category" value={c} className="peer sr-only" required />
              <span className="block rounded-full border border-line px-3.5 py-2 peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:font-semibold">
                {c}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm text-muted">Descrição (opcional)</span>
        <input name="description" maxLength={100} placeholder="Ex.: feira do mês" className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
      </label>

      <label className="block">
        <span className="text-sm text-muted">Data</span>
        <input name="date" type="date" defaultValue={today} max={today} required className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
      </label>

      {state.error && <p className="font-semibold text-expense">{state.error}</p>}
      {state.ok && <p className="font-semibold text-income">✓ {state.ok}</p>}

      <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
