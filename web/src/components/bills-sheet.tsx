"use client";
// Contas a vencer no Início: uma linha discreta que abre uma janela por baixo com as contas,
// a confirmação do pagamento (valor grande, que dá para ajustar) e o "✓" no final.
import { CalendarDays, Check, ChevronRight, Tag, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { payBill, type PayState } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { categoryName } from "@/lib/categories";
import { haptic } from "@/lib/haptic";
import { toBRL } from "@/lib/money";

export type SheetBill = {
  id: number;
  name: string;
  amountCents: number;
  category: string;
  label: string; // "Vence amanhã", "Venceu há 2 dias", "Dia 20"
  tone: "late" | "today" | "soon" | "later";
};

const TONE_TEXT = { late: "text-expense", today: "text-warning", soon: "text-warning", later: "text-muted" };
const TONE_DOT = { late: "bg-expense", today: "bg-warning", soon: "bg-warning", later: "bg-muted" };
const asInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

type Step = { kind: "list" } | { kind: "confirm"; bill: SheetBill } | { kind: "done"; done: NonNullable<PayState["done"]> };

export function BillsSheet({ bills, hide, todayLabel }: { bills: SheetBill[]; hide: boolean; todayLabel: string }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>({ kind: "list" });
  const due = bills.filter((b) => b.tone !== "later");

  const close = () => {
    setOpen(false);
    setStep({ kind: "list" });
  };

  return (
    <>
      {due.length > 0 && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left"
        >
          <span className={`h-2 w-2 flex-none rounded-full ${TONE_DOT[due[0].tone]}`} aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">{due[0].name}</b> {due[0].label.toLowerCase()}
            {due.length > 1 && <span className="text-muted"> · +{due.length - 1} {due.length === 2 ? "conta" : "contas"}</span>}
          </span>
          <ChevronRight size={18} className="flex-none text-muted" />
        </button>
      )}

      {open && (
        <Sheet onClose={close} title={step.kind === "list" ? "Contas a vencer" : step.kind === "confirm" ? "Confirmar pagamento" : "Pagamento confirmado"}>
          {step.kind === "list" && (
            <ul className="divide-y divide-line">
              {bills.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-3">
                  <CategoryIcon category={b.category} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{b.name}</p>
                    <p className={`text-sm font-medium ${TONE_TEXT[b.tone]}`}>{b.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">{hide ? "R$ •••••" : toBRL(b.amountCents)}</p>
                    <button type="button" onClick={() => setStep({ kind: "confirm", bill: b })} className="mt-0.5 text-sm font-semibold text-primary">
                      Paguei
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {step.kind === "confirm" && (
            <Confirm
              bill={step.bill}
              todayLabel={todayLabel}
              onBack={() => setStep({ kind: "list" })}
              onDone={(done) => setStep({ kind: "done", done })}
            />
          )}
          {step.kind === "done" && (
            <div className="flex flex-col items-center pt-2 pb-4 text-center">
              <span className="nf-pop-in flex h-18 w-18 items-center justify-center rounded-full bg-primary text-white">
                <Check size={38} strokeWidth={3} className="nf-check" />
              </span>
              <p className="mt-4 text-xl font-extrabold">{step.done.name} paga</p>
              <p className="mt-1 text-muted">
                {toBRL(step.done.amountCents)} lançado nos gastos.
                <br />
                Próximo vencimento: {step.done.nextDue}.
              </p>
              <button type="button" onClick={close} className="mt-6 w-full rounded-2xl bg-card py-3.5 font-semibold">
                Fechar
              </button>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

/** Tela de confirmação: o valor grande no meio, a data e a categoria, e um botão principal. */
function Confirm({ bill, todayLabel, onBack, onDone }: {
  bill: SheetBill;
  todayLabel: string;
  onBack: () => void;
  onDone: (done: NonNullable<PayState["done"]>) => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();

  const submit = (form: FormData) =>
    start(async () => {
      const result = await payBill(bill.id, {}, form);
      if (result.done) {
        haptic();
        onDone(result.done);
      } else setError(result.error);
    });

  return (
    <form action={submit} className="flex flex-col items-center text-center">
      <CategoryIcon category={bill.category} size={56} />
      <p className="mt-3 text-sm text-muted">Pagamento da conta</p>
      <p className="text-xl font-extrabold">{bill.name}</p>

      <label className="mt-5 block">
        <span className="text-sm text-muted">Valor pago</span>
        <span className="mt-1 flex items-baseline justify-center gap-1.5 border-b-2 border-primary px-2 pb-1">
          <span className="text-2xl font-bold text-muted">R$</span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={asInput(bill.amountCents)}
            aria-label={`Valor pago da conta ${bill.name}`}
            className="w-44 bg-transparent text-center text-4xl font-extrabold tracking-tight tabular-nums outline-none"
          />
        </span>
      </label>
      <p className="mt-2 text-xs text-muted">Toque no valor para ajustar</p>

      <div className="mt-4 flex items-center gap-5 text-sm text-muted">
        <span className="flex items-center gap-1.5"><CalendarDays size={16} /> Pago hoje, {todayLabel}</span>
        <span className="flex items-center gap-1.5"><Tag size={16} /> {categoryName(bill.category)}</span>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-expense">{error}</p>}

      <button disabled={pending} className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-60">
        {pending ? "Confirmando..." : "Confirmar pagamento"}
      </button>
      <button type="button" onClick={onBack} className="mt-2 w-full py-3 font-semibold text-muted">
        Agora não
      </button>
    </form>
  );
}

/** Janela que sobe por baixo. Fecha tocando fora, no X ou com Esc. */
function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return createPortal(
    <div className="nf-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/55 md:items-center" onClick={onClose}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="nf-sheet w-full max-w-md rounded-t-[28px] bg-bg px-5 pt-2.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] outline-none md:rounded-[28px]"
      >
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-line md:hidden" aria-hidden />
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className="flex h-9 w-9 items-center justify-center rounded-full bg-card text-muted">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
