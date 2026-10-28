"use client";
// Partes do Menu que reagem no navegador: copiar o convite e enviar sugestão
import { useActionState, useState } from "react";

import { sendFeedback, type FormState } from "@/app/actions";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="flex-1 rounded-2xl border border-line py-3 font-semibold"
    >
      {copied ? "✓ Copiado" : "Copiar"}
    </button>
  );
}

export function FeedbackForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const result = await sendFeedback(prev, form);
    if (result.ok) (document.getElementById("feedback-form") as HTMLFormElement)?.reset();
    return result;
  }, {});
  return (
    <form id="feedback-form" action={action} className="space-y-2">
      <textarea
        name="message"
        maxLength={1000}
        rows={3}
        placeholder="Uma ideia, algo que não funcionou, o que você sentiu falta..."
        className="w-full rounded-2xl bg-bg px-4 py-3 outline-none"
      />
      {state.error && <p className="text-sm font-semibold text-expense">{state.error}</p>}
      {state.ok && <p className="text-sm font-semibold text-income">✓ {state.ok}</p>}
      <button disabled={pending} className="w-full rounded-2xl border border-line py-3 font-semibold disabled:opacity-60">
        {pending ? "Enviando..." : "Enviar"}
      </button>
    </form>
  );
}
