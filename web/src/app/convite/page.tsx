"use client";
// Primeira vez: o código de convite. Depois disso, a pessoa entra direto.
import { useActionState } from "react";

import { acceptInvite, leave, type FormState } from "@/app/actions";

export default function Page() {
  const [state, action, pending] = useActionState<FormState, FormData>(acceptInvite, {});
  return (
    <main className="nf-glow relative isolate mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-5 px-6">
      <img src="/logo.svg" alt="" className="h-16 w-16" />
      <div>
        <h1 className="text-3xl font-extrabold">Falta só uma coisa</h1>
        <p className="mt-1 text-muted">Digite o código de convite que você recebeu.</p>
      </div>
      <form action={action} className="space-y-3">
        <input name="code" placeholder="Ex.: NORTE2026" autoCapitalize="characters" required className="w-full rounded-2xl bg-card px-4 py-4 text-lg font-semibold tracking-widest outline-none" />
        {state.error && <p className="font-semibold text-expense">{state.error}</p>}
        <button disabled={pending} className="w-full rounded-2xl bg-primary py-4 font-bold text-white disabled:opacity-60">Continuar</button>
      </form>
      <form action={leave}>
        <button className="text-sm text-muted underline">Entrar com outra conta</button>
      </form>
    </main>
  );
}
