"use client";
// Contas a vencer: o formulário de cadastro no Menu
import { useActionState } from "react";

import { addBill, type FormState } from "@/app/actions";
import { categoryName, EXPENSE_CATEGORIES } from "@/lib/categories";

/** Cadastro de uma conta no Menu. Fica fechado até tocar em "Adicionar conta". */
export function BillForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await addBill(prev, form);
    if (result.ok) (document.getElementById("bill-form") as HTMLFormElement)?.reset();
    return result;
  }, {});
  const field = "mt-1 w-full rounded-xl bg-bg px-3 py-2.5";

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-sm font-semibold text-primary">+ Adicionar conta</summary>
      <form id="bill-form" action={action} className="mt-3 space-y-3">
        <label className="block">
          <span className="text-sm text-muted">Nome</span>
          <input name="name" maxLength={60} placeholder="Ex.: Luz, Internet, Aluguel" className={field} />
        </label>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="text-sm text-muted">Valor (R$)</span>
            <input name="amount" inputMode="decimal" placeholder="120,00" className={field} />
          </label>
          <label className="w-28">
            <span className="text-sm text-muted">Vence todo dia</span>
            <input name="dueDay" type="number" min={1} max={31} placeholder="10" className={field} />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-muted">Categoria</span>
          <select name="category" defaultValue="💡 Contas" className={field}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{categoryName(c)}</option>
            ))}
          </select>
        </label>
        {state.error && <p className="text-sm font-semibold text-expense">{state.error}</p>}
        {state.ok && <p className="text-sm font-semibold text-income">{state.ok}</p>}
        <button disabled={pending} className="w-full rounded-2xl bg-primary py-3 font-semibold text-white disabled:opacity-60">
          {pending ? "Salvando..." : "Salvar conta"}
        </button>
      </form>
    </details>
  );
}
