"use client";
// "Sobrou dinheiro?": a linha do Início e a janela com o passo a passo (reserva, dívidas, investir).
// Conteúdo educativo, sem recomendar produto nem banco (regra da CVM).
// Revisar de tempos em tempos: os textos sobre FGC e Tesouro (regras podem mudar).
import { CalendarDays, ChevronDown, ChevronRight, CreditCard, ExternalLink, Info, LifeBuoy, TrendingUp } from "lucide-react";
import { useActionState, useState } from "react";

import { savePayday, type FormState } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { toBRL } from "@/lib/money";
import type { Savings } from "@/lib/savings";

const OPTIONS = [
  { name: "Tesouro Selic", text: "Título do governo, o investimento mais seguro do país. Dá para resgatar em qualquer dia útil.", link: "https://www.tesourodireto.com.br/" },
  { name: "CDB com liquidez diária", text: "Você empresta para um banco e ele devolve com juros. Garantido pelo FGC até R$ 250 mil por banco.", link: "https://www.fgc.org.br/" },
  { name: "Conta que rende", text: "O dinheiro rende na própria conta do banco digital, sem precisar escolher um investimento.", link: null },
  { name: "LCI e LCA", text: "Parecido com o CDB, mas o dinheiro fica guardado por um prazo. Bom para objetivos de médio prazo.", link: "https://www.fgc.org.br/" },
  { name: "Tesouro IPCA+", text: "Rende acima da inflação, então o dinheiro não perde valor. Bom para o longo prazo.", link: "https://www.tesourodireto.com.br/" },
];

/** Arredonda para R$ 100 (fica mais fácil de ler: "R$ 4.500" em vez de "R$ 4.487,30"). */
const round100 = (cents: number) => Math.round(cents / 10_000) * 10_000;
const short = (cents: number) => toBRL(cents).replace(/,00$/, "");

export function SavingsSheet({ savings, hide }: { savings: Savings; hide: boolean }) {
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const [editing, setEditing] = useState(false);
  const avg = savings.averageExpenseCents;

  return (
    <>
      {savings.visible && (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left">
          <TrendingUp size={20} className="flex-none text-primary" />
          <span className="min-w-0 flex-1 truncate">
            <b className="font-semibold">Sobrou dinheiro?</b> <span className="text-muted">Veja o que fazer</span>
          </span>
          <ChevronRight size={18} className="flex-none text-muted" />
        </button>
      )}

      {open && (
        <Sheet title={hide ? "Sobrou dinheiro. E agora?" : `Sobrou ${toBRL(savings.amountCents)}. E agora?`} onClose={() => setOpen(false)}>
          <div className="max-h-[70dvh] overflow-y-auto pr-1">
            <p className="text-sm text-muted">
              {savings.rule ? "Conta feita desde o seu último salário. " : ""}A ordem que os educadores financeiros recomendam:
            </p>

            <Step icon={<LifeBuoy size={20} />} color="#10b981" n={1} title="Reserva de emergência"
              text="Dinheiro guardado para imprevistos, como um conserto ou ficar sem renda.">
              <div className="mt-2 rounded-2xl bg-card px-3.5 py-2.5 text-sm">
                {avg && !hide ? (
                  <>
                    <span className="text-muted">Você gasta em média {short(round100(avg))} por mês. A sua reserva ideal:</span>
                    <br />
                    <b className="text-base">{short(round100(avg * 3))} a {short(round100(avg * 6))}</b> <span className="text-muted">(3 a 6 meses)</span>
                  </>
                ) : (
                  <span className="text-muted">O ideal é guardar o equivalente a <b className="text-fg">3 a 6 meses</b> dos seus gastos.</span>
                )}
              </div>
            </Step>

            <Step icon={<CreditCard size={20} />} color="#f97066" n={2} title="Dívidas caras primeiro"
              text="Cartão atrasado ou cheque especial cobram juros altos. Quitar rende mais do que qualquer investimento." />

            <Step icon={<TrendingUp size={20} />} color="#3b82f6" n={3} title="Começar a investir"
              text="As opções mais conhecidas para começar com segurança:" last>
              <ul className="mt-2 space-y-2">
                {OPTIONS.slice(0, more ? OPTIONS.length : 2).map((o) => (
                  <li key={o.name} className="rounded-2xl bg-card px-3.5 py-2.5 text-sm">
                    <b>{o.name}</b>
                    <p className="text-muted">{o.text}</p>
                    {o.link && (
                      <a href={o.link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 font-semibold text-primary">
                        Saiba mais <ExternalLink size={13} />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
              {!more && (
                <button type="button" onClick={() => setMore(true)} className="mt-2 flex items-center gap-1 text-sm font-semibold text-primary">
                  Ver mais opções <ChevronDown size={16} />
                </button>
              )}
            </Step>

            <p className="mt-3 flex gap-2 text-xs text-muted">
              <Info size={15} className="mt-px flex-none" /> Conteúdo educativo. Não é recomendação de investimento.
            </p>

            <div className="mt-4 border-t border-line pt-3 text-sm">
              {editing ? (
                <PaydayForm savings={savings} onDone={() => setEditing(false)} />
              ) : (
                <p className="flex items-center gap-2 text-muted">
                  <CalendarDays size={16} className="flex-none" />
                  <span className="flex-1">
                    {savings.ruleText ? <>Seu salário cai {savings.ruleText}</> : "Diga quando você recebe, para o aviso chegar na hora certa"}
                  </span>
                  <button type="button" onClick={() => setEditing(true)} className="font-semibold text-primary">
                    {savings.ruleText ? "Alterar" : "Definir"}
                  </button>
                </p>
              )}
            </div>
          </div>
        </Sheet>
      )}
    </>
  );
}

function Step({ icon, color, n, title, text, children, last }: {
  icon: React.ReactNode; color: string; n: number; title: string; text: string; children?: React.ReactNode; last?: boolean;
}) {
  return (
    <section className={`flex gap-3 py-3.5 ${last ? "" : "border-b border-line"}`}>
      <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full" style={{ background: `${color}26`, color }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold tracking-wide text-primary uppercase">Passo {n}</p>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm text-muted">{text}</p>
        {children}
      </div>
    </section>
  );
}

/** Quando a pessoa recebe: dia fixo, 5º dia útil ou último dia útil. */
function PaydayForm({ savings, onDone }: { savings: Savings; onDone: () => void }) {
  const [kind, setKind] = useState(savings.rule?.kind ?? "last_business");
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await savePayday(prev, form);
    if (result.ok) onDone();
    return result;
  }, {});
  const choices = [
    { value: "fixed", label: "Num dia fixo" },
    { value: "fifth_business", label: "No 5º dia útil" },
    { value: "last_business", label: "No último dia útil" },
  ] as const;

  return (
    <form action={action} className="space-y-2">
      <p className="font-semibold">Quando você recebe o salário?</p>
      {choices.map((c) => (
        <label key={c.value} className="flex cursor-pointer items-center gap-3 rounded-xl bg-card px-3.5 py-2.5">
          <input type="radio" name="kind" value={c.value} checked={kind === c.value} onChange={() => setKind(c.value)} className="h-4 w-4 accent-[var(--primary)]" />
          <span className="flex-1">{c.label}</span>
          {c.value === "fixed" && kind === "fixed" && (
            <input name="day" type="number" inputMode="numeric" min={1} max={31} required aria-label="Dia do salário"
              defaultValue={savings.rule?.kind === "fixed" ? (savings.rule.day ?? undefined) : undefined} placeholder="Dia"
              className="w-16 rounded-lg bg-bg px-2 py-1 text-center" />
          )}
        </label>
      ))}
      <p className="text-xs text-muted">O app pula fins de semana e feriados nacionais.</p>
      {state.error && <p className="text-sm font-semibold text-expense">{state.error}</p>}
      <button disabled={pending} className="mt-1 w-full rounded-2xl bg-primary py-3.5 font-bold text-white disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar"}
      </button>
      <button type="button" onClick={onDone} className="w-full py-2.5 font-semibold text-muted">Cancelar</button>
    </form>
  );
}
