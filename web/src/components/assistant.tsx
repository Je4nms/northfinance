"use client";
// Balão do assistente de IA (no Extrato) e a janela da conversa.
// Na primeira vez mostra o aviso de privacidade; a resposta aparece sendo escrita aos poucos.
import { ArrowUp, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { acceptAiConsent } from "@/app/actions";
import { Sheet } from "@/components/sheet";

type Turn = { role: "user" | "assistant"; text: string; error?: boolean };

const noop = () => () => {};

const EXAMPLES = [
  "Quanto gastei este mês?",
  "Em que eu mais gastei no mês passado?",
  "Gastei mais ou menos que no mês passado?",
  "Quanto gastei com comida fora este mês?",
];

export function Assistant({ consented: startConsented, used: startUsed, limit }: { consented: boolean; used: number; limit: number }) {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(startConsented);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(startUsed);
  const end = useRef<HTMLDivElement>(null);
  // O balão vai direto no <body>: dentro da tela, a animação de entrada "prenderia" o position: fixed
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false no servidor, true no navegador

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...turns.filter((t) => !t.error), { role: "user" as const, text: q }];
    setTurns([...turns, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setQuestion("");
    setBusy(true);
    const write = (fn: (t: Turn) => Turn) => setTurns((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        write(() => ({ role: "assistant", text: data?.error ?? "O assistente não conseguiu responder agora.", error: true }));
        return;
      }
      setUsed((n) => n + 1);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        write((t) => ({ ...t, text: t.text + chunk }));
      }
    } catch {
      write(() => ({ role: "assistant", text: "Sem conexão. Confira a internet e tente de novo.", error: true }));
    } finally {
      setBusy(false);
    }
  }

  const left = Math.max(limit - used, 0);

  return (
    <>
      {mounted && createPortal(
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Perguntar ao assistente"
          className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/30 transition-transform active:scale-95 md:bottom-24"
        >
          <Sparkles size={24} />
        </button>,
        document.body,
      )}

      {open && (
        <Sheet title="Assistente" onClose={() => setOpen(false)}>
          {!consented ? (
            <div className="space-y-4 pb-1">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary"><Lock size={22} /></span>
              <p className="text-lg font-bold">Antes de começar</p>
              <p className="text-muted">
                Para responder, o assistente consulta os seus lançamentos (valores, categorias, descrições e datas) e envia à
                <b className="text-fg"> Anthropic</b>, a empresa da IA. Seu e-mail, nome e foto não são enviados, e os dados não são usados para treinar a IA.
              </p>
              <p className="text-sm text-muted">Ele só consulta: não cria, não muda e não apaga nada. Até {limit} perguntas por dia.</p>
              <form action={async () => { await acceptAiConsent(); setConsented(true); }}>
                <button className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white">Aceitar e continuar</button>
              </form>
              <button type="button" onClick={() => setOpen(false)} className="w-full py-2 font-semibold text-muted">Agora não</button>
            </div>
          ) : (
            <div className="flex max-h-[70dvh] flex-col">
              <div className="min-h-40 flex-1 space-y-3 overflow-y-auto pb-2" aria-live="polite">
                {turns.length === 0 ? (
                  <div>
                    <p className="text-muted">Pergunte sobre os seus ganhos e gastos. Por exemplo:</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {EXAMPLES.map((e) => (
                        <button key={e} type="button" onClick={() => ask(e)} disabled={left === 0}
                          className="rounded-full border border-line px-3.5 py-2 text-left text-sm disabled:opacity-50">{e}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  turns.map((t, i) => (
                    <div key={i} className={t.role === "user" ? "flex justify-end" : ""}>
                      <p className={`max-w-[85%] rounded-2xl px-4 py-2.5 break-words whitespace-pre-wrap ${
                        t.role === "user" ? "rounded-br-md bg-primary text-white" : t.error ? "bg-expense/10 text-fg" : "rounded-bl-md bg-card"
                      }`}>
                        {t.text || <Dots />}
                      </p>
                    </div>
                  ))
                )}
                <div ref={end} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="flex items-end gap-2 border-t border-line pt-3">
                <label className="sr-only" htmlFor="ai-question">Sua pergunta</label>
                <textarea
                  id="ai-question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
                  rows={1}
                  maxLength={500}
                  placeholder={left === 0 ? "Volte amanhã para mais perguntas" : "Pergunte sobre seus gastos..."}
                  disabled={left === 0}
                  className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl bg-card px-4 py-3 outline-none disabled:opacity-60"
                />
                <button disabled={busy || !question.trim() || left === 0} aria-label="Enviar pergunta"
                  className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary text-white disabled:opacity-40">
                  <ArrowUp size={22} />
                </button>
              </form>
              <p className="mt-2 text-center text-xs text-muted">
                {left} de {limit} perguntas restantes hoje · A IA pode errar: confira os valores no Extrato.
              </p>
            </div>
          )}
        </Sheet>
      )}
    </>
  );
}

function Dots() {
  return (
    <span className="inline-flex gap-1 py-1" aria-label="Pensando">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </span>
  );
}
