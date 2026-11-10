"use client";
// Contas a vencer: o botão "Paguei" (com confirmação do valor) e o formulário de cadastro no Menu
import { useActionState, useState } from "react";

import { addBill, payBill, type FormState } from "@/app/actions";
import { categoryName, EXPENSE_CATEGORIES } from "@/lib/categories";

const asInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

/** "Paguei": abre a confirmação com o valor já preenchido, que dá para ajustar (luz e água mudam todo mês). */
export function PayButton({ id, name, amountCents }: { id: number; name: string; amountCents: number }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<FormState, FormData>(payBill.bind(null, id), {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white">
        Paguei
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 w-full space-y-2 rounded-2xl bg-bg/70 p-3">
      <label className="block">
        <span className="text-sm font-semibold">Pagou {name}? Confira o valor:</span>
        <span className="mt-1 flex items-center gap-2 rounded-xl border border-line bg-bg px-3 py-2">
          <span className="text-muted">R$</span>
          <input name="amount" inputMode="decimal" defaultValue={asInput(amountCents)} autoFocus className="min-w-0 flex-1 bg-transparent font-bold outline-none" />
        </span>
      </label>
      {state.error && <p className="text-sm font-semibold text-expense">{state.error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-line py-2.5 font-semibold">Cancelar</button>
        <button disabled={pending} className="flex-1 rounded-xl bg-primary py-2.5 font-semibold text-white disabled:opacity-60">
          {pending ? "Salvando..." : "Confirmar"}
        </button>
      </div>
    </form>
  );
}

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
