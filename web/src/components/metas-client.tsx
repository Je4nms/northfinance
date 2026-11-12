"use client";
// Parte interativa da aba Metas: lista, "Anotar que guardei/tirei", nova meta, detalhes,
// a apresentação da primeira vez e o ✓ verde.
import { CalendarDays, Info, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { useActionState, useCallback, useEffect, useState } from "react";

import { addGoal, addGoalEntry, deleteGoal, deleteGoalEntry, updateGoal, type FormState } from "@/app/actions";
import { Celebrate } from "@/components/celebrate";
import { GoalGlyph, GoalIcon, goalColor } from "@/components/goal-icon";
import { Sheet } from "@/components/sheet";
import { GOAL_ICONS, type GoalIconName } from "@/lib/goals";
import { dayLabel, toBRL } from "@/lib/money";

export type GoalView = {
  id: number;
  name: string;
  icon: string;
  targetCents: number;
  place: string | null;
  savedCents: number;
  entries: { id: number; amountCents: number; day: string }[];
};

type Open =
  | null
  | { kind: "new" }
  | { kind: "entry"; direction: "in" | "out"; goalId?: number }
  | { kind: "detail"; goalId: number }
  | { kind: "edit"; goalId: number };

const INTRO = "nf-metas-intro";
const short = (cents: number) => toBRL(cents).replace(/,00$/, "");
const percent = (g: GoalView) => Math.min(100, Math.floor((Math.max(g.savedCents, 0) / g.targetCents) * 100));
const asInput = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export function MetasClient({ ready, hide, today, monthSaved, reserveHint, goals }: {
  ready: boolean; hide: boolean; today: string; monthSaved: number; reserveHint: number | null; goals: GoalView[];
}) {
  const [open, setOpen] = useState<Open>(null);
  const [intro, setIntro] = useState(false);
  const [celebrate, setCelebrate] = useState<{ title: string; detail?: string } | null>(null);
  const fmt = (cents: number) => (hide ? "R$ •••••" : toBRL(cents));
  const total = goals.reduce((sum, g) => sum + g.savedCents, 0);
  const close = useCallback(() => setOpen(null), []);
  const endCelebrate = useCallback(() => setCelebrate(null), []);

  // Apresentação: só na primeira vez que a pessoa abre a aba
  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(INTRO) === "1";
    } catch {}
    if (!seen) {
      const timer = setTimeout(() => setIntro(true), 400);
      return () => clearTimeout(timer);
    }
  }, []);
  const closeIntro = () => {
    try {
      localStorage.setItem(INTRO, "1");
    } catch {}
    setIntro(false);
  };

  const done = (result: FormState) => {
    setOpen(null);
    if (result.ok) setCelebrate({ title: result.ok, detail: result.detail });
  };

  if (!ready) {
    return <p className="rounded-3xl bg-card p-4 text-muted">As metas ainda não foram ativadas no banco de dados.</p>;
  }

  const goal = open && "goalId" in open ? goals.find((g) => g.id === open.goalId) : undefined;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-card p-4">
        <p className="text-sm text-muted">Você já guardou</p>
        <p className="text-4xl leading-tight font-extrabold tracking-tight tabular-nums">{fmt(total)}</p>
        {monthSaved !== 0 && !hide && (
          <p className={`text-sm font-semibold ${monthSaved > 0 ? "text-income" : "text-muted"}`}>
            {monthSaved > 0 ? "+" : "−"} {toBRL(Math.abs(monthSaved))} este mês
          </p>
        )}
      </section>

      {goals.length === 0 ? (
        <section className="flex flex-col items-center rounded-3xl border border-dashed border-line p-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"><PiggyBank size={28} /></span>
          <p className="mt-3 text-lg font-bold">Qual é o seu sonho?</p>
          <p className="mt-1 text-sm text-muted">Crie uma meta, anote o que for guardando no seu banco e veja quanto falta.</p>
          <button type="button" onClick={() => setOpen({ kind: "new" })} className="mt-4 w-full rounded-2xl bg-primary py-3.5 font-bold text-white">
            Criar minha primeira meta
          </button>
        </section>
      ) : (
        <section>
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-lg font-bold">Suas metas</h2>
            <button type="button" onClick={() => setOpen({ kind: "new" })} className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Plus size={16} /> Nova meta
            </button>
          </div>
          <ul>
            {goals.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => setOpen({ kind: "detail", goalId: g.id })}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2.5 text-left transition-colors hover:bg-card">
                  <GoalIcon icon={g.icon} />
                  <div className="min-w-0 flex-1">
                    <p className="flex justify-between gap-2"><b className="truncate">{g.name}</b><span className="text-sm text-muted">{percent(g)}%</span></p>
                    <Progress goal={g} />
                    <p className="truncate text-sm text-muted">
                      {hide ? "R$ •••••" : `${short(g.savedCents)} de ${short(g.targetCents)}`}{g.place ? ` · ${g.place}` : ""}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setOpen({ kind: "entry", direction: "in" })}
            className="mt-3 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white transition-transform active:scale-[0.98]">
            Anotar que guardei
          </button>
          <button type="button" onClick={() => setOpen({ kind: "entry", direction: "out" })} className="mt-1 w-full py-3 font-semibold text-muted">
            Anotar que tirei
          </button>
        </section>
      )}

      <p className="flex gap-2 text-xs text-muted">
        <Info size={15} className="mt-px flex-none" />
        O NorthFinance não guarda nem movimenta dinheiro. Você guarda no seu banco e anota aqui para acompanhar.
      </p>

      {open?.kind === "new" && (
        <Sheet title="Nova meta" onClose={close}>
          <GoalForm reserveHint={reserveHint} onDone={done} />
        </Sheet>
      )}
      {open?.kind === "edit" && goal && (
        <Sheet title="Editar meta" onClose={close}>
          <GoalForm goal={goal} reserveHint={null} onDone={done} />
        </Sheet>
      )}
      {open?.kind === "entry" && (
        <Sheet title={open.direction === "in" ? "Anotar que guardei" : "Anotar que tirei"} onClose={close}>
          <EntryForm direction={open.direction} goals={goals} goalId={open.goalId} today={today} onDone={done} />
        </Sheet>
      )}
      {open?.kind === "detail" && goal && (
        <Sheet title={goal.name} onClose={close}>
          <Detail goal={goal} fmt={fmt} today={today}
            onEntry={(direction) => setOpen({ kind: "entry", direction, goalId: goal.id })}
            onEdit={() => setOpen({ kind: "edit", goalId: goal.id })}
            onDeleted={close} />
        </Sheet>
      )}

      {intro && (
        <Sheet title="Como funcionam as Metas" onClose={closeIntro}>
          <ol className="space-y-3">
            {[
              ["Você guarda o dinheiro onde quiser", "Poupança, caixinha do banco, Tesouro..."],
              ["Anota aqui quanto guardou", "Toque em \"Anotar que guardei\" sempre que guardar."],
              ["O app mostra quanto falta", "E comemora com você quando a meta for concluída."],
            ].map(([title, text], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-primary/15 font-bold text-primary">{i + 1}</span>
                <div>
                  <p className="font-semibold">{title}</p>
                  <p className="text-sm text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-sm">
            <b>O NorthFinance não guarda nem movimenta dinheiro.</b> Ele só anota, para você acompanhar.
          </p>
          <button type="button" onClick={closeIntro} className="mt-5 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white">Entendi</button>
        </Sheet>
      )}

      {celebrate && <Celebrate title={celebrate.title} detail={celebrate.detail} onEnd={endCelebrate} />}
    </div>
  );
}

function Progress({ goal }: { goal: GoalView }) {
  return (
    <div className="my-1.5 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={percent(goal)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${goal.name}`}>
      <span className="block h-full rounded-full" style={{ width: `${Math.max(percent(goal), 2)}%`, background: goalColor(goal.icon) }} />
    </div>
  );
}

/** Criar ou editar uma meta. A dica da reserva de emergência preenche tudo com um toque. */
function GoalForm({ goal, reserveHint, onDone }: { goal?: GoalView; reserveHint: number | null; onDone: (r: FormState) => void }) {
  const [name, setName] = useState(goal?.name ?? "");
  const [icon, setIcon] = useState<string>(goal?.icon ?? "outro");
  const [target, setTarget] = useState(goal ? asInput(goal.targetCents) : "");
  const save = goal ? updateGoal.bind(null, goal.id) : addGoal;
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await save(prev, form);
    if (result.ok) onDone(result);
    return result;
  }, {});

  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm text-muted">Qual é o seu sonho?</span>
        <input name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required placeholder="Ex.: Viagem, celular novo, casa"
          className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Ícone</legend>
        <input type="hidden" name="icon" value={icon} />
        <div className="flex flex-wrap gap-2">
          {(Object.keys(GOAL_ICONS) as GoalIconName[]).map((key) => (
            <button key={key} type="button" onClick={() => setIcon(key)} aria-pressed={icon === key} aria-label={GOAL_ICONS[key].label}
              className={`flex h-11 w-11 items-center justify-center rounded-full border ${icon === key ? "border-primary bg-primary/15" : "border-line"}`}>
              <GoalGlyph icon={key} size={19} />
            </button>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="text-sm text-muted">Quanto você quer juntar?</span>
        <div className="mt-1 flex items-baseline gap-2 border-b-2 border-line pb-1 focus-within:border-primary">
          <span className="text-2xl font-bold text-muted">R$</span>
          <input name="target" value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="0,00" required autoComplete="off"
            className="w-full bg-transparent text-4xl font-extrabold outline-none" />
        </div>
      </label>

      {reserveHint && (
        <div className="flex gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm">
          <GoalGlyph icon="reserva" size={18} />
          <p className="flex-1">
            Ainda não tem uma <b>reserva de emergência</b>? Para você, o ideal é <b>{short(reserveHint)}</b> (6 meses dos seus gastos).{" "}
            <button type="button" onClick={() => { setName("Reserva de emergência"); setIcon("reserva"); setTarget(asInput(reserveHint)); }}
              className="font-semibold text-primary">Usar essa meta</button>
          </p>
        </div>
      )}

      <label className="block">
        <span className="text-sm text-muted">Onde você guarda? (opcional)</span>
        <input name="place" defaultValue={goal?.place ?? ""} maxLength={60} placeholder="Ex.: caixinha do banco, poupança"
          className="mt-1 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
      </label>

      {state.error && <p role="alert" className="font-semibold text-expense">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-60">
        {pending ? "Salvando..." : goal ? "Salvar alterações" : "Criar meta"}
      </button>
    </form>
  );
}

/** "Anotar que guardei" ou "Anotar que tirei": valor, meta e data. */
function EntryForm({ direction, goals, goalId, today, onDone }: {
  direction: "in" | "out"; goals: GoalView[]; goalId?: number; today: string; onDone: (r: FormState) => void;
}) {
  const yesterday = new Date(Date.parse(today + "T00:00:00Z") - 86_400_000).toISOString().slice(0, 10);
  const [dateMode, setDateMode] = useState<"today" | "yesterday" | "other">("today");
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await addGoalEntry(prev, form);
    if (result.ok) onDone(result);
    return result;
  }, {});
  const options = direction === "out" ? goals.filter((g) => g.savedCents > 0) : goals;

  if (options.length === 0) {
    return <p className="pb-4 text-muted">Nenhuma meta tem dinheiro anotado ainda.</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="direction" value={direction} />
      <label className="block">
        <span className="text-sm text-muted">Valor</span>
        <div className="mt-1 flex items-baseline gap-2 border-b-2 border-line pb-1 focus-within:border-primary">
          <span className="text-2xl font-bold text-muted">R$</span>
          <input name="amount" inputMode="decimal" placeholder="0,00" required autoComplete="off" className="w-full bg-transparent text-4xl font-extrabold outline-none" />
        </div>
      </label>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">{direction === "in" ? "Para qual meta?" : "De qual meta?"}</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((g) => (
            <label key={g.id} className="cursor-pointer">
              <input type="radio" name="goal" value={g.id} required defaultChecked={g.id === goalId || options.length === 1} className="peer sr-only" />
              <span className="flex items-center gap-2 rounded-full border border-line px-3.5 py-2 transition-colors peer-checked:border-primary peer-checked:bg-primary/15 peer-checked:font-semibold">
                <GoalGlyph icon={g.icon} /> {g.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Data</legend>
        <div className="flex gap-2">
          {([["today", "Hoje"], ["yesterday", "Ontem"], ["other", "Outro dia"]] as const).map(([mode, label]) => (
            <button key={mode} type="button" aria-pressed={dateMode === mode} onClick={() => setDateMode(mode)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 ${dateMode === mode ? "border-primary bg-primary/15 font-semibold" : "border-line"}`}>
              {mode === "other" && <CalendarDays size={16} />} {label}
            </button>
          ))}
        </div>
        {dateMode === "other" ? (
          <input name="date" type="date" max={today} required aria-label="Escolha a data" className="mt-2 w-full rounded-2xl bg-card px-4 py-3 outline-none" />
        ) : (
          <input type="hidden" name="date" value={dateMode === "today" ? today : yesterday} />
        )}
      </fieldset>

      {state.error && <p role="alert" className="font-semibold text-expense">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-60">
        {pending ? "Anotando..." : "Anotar"}
      </button>
    </form>
  );
}

/** Detalhes de uma meta: progresso, histórico, anotar, editar e apagar. */
function Detail({ goal, fmt, today, onEntry, onEdit, onDeleted }: {
  goal: GoalView; fmt: (cents: number) => string; today: string;
  onEntry: (direction: "in" | "out") => void; onEdit: () => void; onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const left = goal.targetCents - goal.savedCents;
  const todayDate = new Date(today + "T00:00:00Z");

  return (
    <div className="max-h-[70dvh] space-y-4 overflow-y-auto pr-1">
      <div className="flex items-center gap-3">
        <GoalIcon icon={goal.icon} size={52} />
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-extrabold tracking-tight">{fmt(goal.savedCents)}</p>
          <p className="text-sm text-muted">de {fmt(goal.targetCents)} · {percent(goal)}%</p>
        </div>
      </div>
      <Progress goal={goal} />
      <p className="text-sm text-muted">
        {left > 0 ? <>Faltam <b className="text-fg">{fmt(left)}</b></> : <b className="text-income">Meta concluída!</b>}
        {goal.place ? ` · Guardado em: ${goal.place}` : ""}
      </p>

      <button type="button" onClick={() => onEntry("in")} className="w-full rounded-2xl bg-primary py-3.5 font-bold text-white">Anotar que guardei</button>
      {goal.savedCents > 0 && (
        <button type="button" onClick={() => onEntry("out")} className="-mt-2 w-full py-2.5 font-semibold text-muted">Anotar que tirei</button>
      )}

      {goal.entries.length > 0 && (
        <section>
          <h3 className="font-bold">Histórico</h3>
          <ul className="mt-1 divide-y divide-line">
            {goal.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 text-sm text-muted">{dayLabel(new Date(e.day + "T00:00:00Z"), todayDate)}</span>
                <span className={`font-semibold tabular-nums ${e.amountCents > 0 ? "text-income" : "text-muted"}`}>
                  {e.amountCents > 0 ? "+" : "−"} {fmt(Math.abs(e.amountCents))}
                </span>
                <form action={deleteGoalEntry.bind(null, e.id)}>
                  <button aria-label="Apagar esta anotação" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:text-expense"><Trash2 size={16} /></button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex items-center justify-between border-t border-line pt-3">
        <button type="button" onClick={onEdit} className="flex items-center gap-1.5 font-semibold text-primary"><Pencil size={16} /> Editar meta</button>
        {!confirm && <button type="button" onClick={() => setConfirm(true)} className="flex items-center gap-1.5 font-semibold text-expense"><Trash2 size={16} /> Apagar</button>}
      </div>
      {confirm && (
        <div className="rounded-2xl bg-expense/10 p-3 text-sm">
          <p>Apagar <b>{goal.name}</b>? O histórico dela também será apagado.</p>
          <form action={async () => { await deleteGoal(goal.id); onDeleted(); }} className="mt-2 flex gap-2">
            <button type="button" onClick={() => setConfirm(false)} className="flex-1 py-2 font-semibold text-muted">Cancelar</button>
            <button className="flex-1 rounded-xl bg-expense py-2 font-semibold text-white">Apagar meta</button>
          </form>
        </div>
      )}
    </div>
  );
}
