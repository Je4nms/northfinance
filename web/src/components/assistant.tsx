"use client";
// Balão do assistente de IA (no Extrato) e a conversa, em tela quase cheia.
// Mostra o que a IA está consultando, colore os valores, sugere a próxima pergunta
// e guarda a conversa até a pessoa fechar o app (ou tocar em "Nova").
import { ArrowUp, Lock, Plus, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { acceptAiConsent } from "@/app/actions";
import { Sheet } from "@/components/sheet";
import { haptic } from "@/lib/haptic";

type Turn = { role: "user" | "assistant"; text: string; status?: string; suggestions?: string[]; error?: boolean };
type ServerEvent = { t: "text" | "status" | "error"; text: string } | { t: "suggestions"; items: string[] };

const STORAGE = "nf-chat";
const noop = () => () => {};

const EXAMPLES = [
  "Quanto gastei este mês?",
  "Em que eu mais gastei no mês passado?",
  "Gastei mais ou menos que no mês passado?",
  "Quanto gastei com comida fora este mês?",
];

function loadTurns(): Turn[] {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE) ?? "[]");
    return Array.isArray(saved) ? saved.filter((t: Turn) => t && !t.error && t.text) : [];
  } catch {
    return [];
  }
}

export function Assistant({ consented: startConsented, used: startUsed, limit }: { consented: boolean; used: number; limit: number }) {
  const [open, setOpen] = useState(false);
  const [consented, setConsented] = useState(startConsented);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [used, setUsed] = useState(startUsed);
  const end = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  // O balão vai direto no <body>: dentro da tela, a animação de entrada "prenderia" o position: fixed
  const mounted = useSyncExternalStore(noop, () => true, () => false); // false no servidor, true no navegador

  // Só salva depois de ler a conversa guardada (senão a tela vazia apagaria a conversa ao trocar de aba)
  const loaded = useRef(false);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    if (!loaded.current) return;
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(turns.filter((t) => !t.error && t.text)));
    } catch {}
  }, [turns]);

  function openChat() {
    if (!loaded.current) {
      loaded.current = true;
      setTurns(loadTurns());
    }
    setOpen(true);
  }

  function resize() {
    const el = input.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }

  async function ask(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const history = [...turns.filter((t) => !t.error && t.text), { role: "user" as const, text: q }];
    setTurns([...turns, { role: "user", text: q }, { role: "assistant", text: "" }]);
    setQuestion("");
    requestAnimationFrame(resize);
    setBusy(true);
    const update = (fn: (t: Turn) => Turn) => setTurns((all) => [...all.slice(0, -1), fn(all[all.length - 1])]);
    let failed = false;

    try {
      const res = await fetch("/api/assistente", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, text }) => ({ role, text })) }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        failed = true;
        update(() => ({ role: "assistant", text: data?.error ?? "O assistente não conseguiu responder agora.", error: true }));
        return;
      }
      setUsed((n) => n + 1);
      // A resposta chega em linhas JSON, uma por evento
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as ServerEvent;
          if (event.t === "status") update((t) => ({ ...t, text: "", status: event.text || undefined }));
          else if (event.t === "text") update((t) => ({ ...t, text: t.text + event.text, status: undefined }));
          else if (event.t === "suggestions") update((t) => ({ ...t, suggestions: event.items }));
          else if (event.t === "error") {
            failed = true;
            update(() => ({ role: "assistant", text: event.text, error: true }));
          }
        }
      }
    } catch {
      failed = true;
      update(() => ({ role: "assistant", text: "Sem conexão. Confira a internet e tente de novo.", error: true }));
    } finally {
      setBusy(false);
      if (!failed) haptic();
    }
  }

  const left = Math.max(limit - used, 0);
  const last = turns[turns.length - 1];

  const header = (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <Avatar size={36} />
      <div className="min-w-0 flex-1">
        <p className="font-bold leading-tight">Assistente</p>
        <p className="truncate text-xs text-muted">Consulta só os seus dados</p>
      </div>
      {consented && turns.length > 0 && (
        <button type="button" onClick={() => { setTurns([]); setQuestion(""); }} disabled={busy}
          className="flex h-9 items-center gap-1 rounded-full bg-card px-3 text-sm font-semibold text-muted disabled:opacity-50">
          <Plus size={15} /> Nova
        </button>
      )}
    </div>
  );

  return (
    <>
      {mounted && createPortal(
        <button
          type="button"
          onClick={openChat}
          aria-label="Perguntar ao assistente"
          className="fixed right-4 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-black/30 transition-transform active:scale-95 md:bottom-24"
        >
          <Sparkles size={24} />
        </button>,
        document.body,
      )}

      {open && (
        <Sheet title="Assistente" header={header} tall={consented} onClose={() => setOpen(false)}>
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
            <>
              <div className="-mx-5 flex-1 space-y-3 overflow-y-auto border-t border-line px-5 py-4" aria-live="polite">
                {turns.length === 0 ? (
                  <div className="flex flex-col items-center pt-6 text-center">
                    <Avatar size={56} />
                    <p className="mt-3 text-lg font-bold">Pergunte sobre o seu dinheiro</p>
                    <p className="text-sm text-muted">Eu consulto os seus lançamentos e respondo em segundos.</p>
                    <div className="mt-5 flex w-full flex-col gap-2">
                      {EXAMPLES.map((e) => (
                        <button key={e} type="button" onClick={() => ask(e)} disabled={left === 0}
                          className="nf-msg rounded-2xl border border-line px-4 py-3 text-left disabled:opacity-50">{e}</button>
                      ))}
                    </div>
                  </div>
                ) : (
                  turns.map((t, i) =>
                    t.role === "user" ? (
                      <div key={i} className="nf-msg flex justify-end">
                        <p className="max-w-[82%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5 break-words whitespace-pre-wrap text-white">{t.text}</p>
                      </div>
                    ) : (
                      <div key={i} className="nf-msg space-y-2">
                        <div className="flex items-end gap-2">
                          <Avatar size={28} />
                          {t.status && !t.text ? (
                            <p className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-muted">
                              <span className="h-3.5 w-3.5 flex-none animate-spin rounded-full border-2 border-line border-t-primary" aria-hidden />
                              {t.status}
                            </p>
                          ) : (
                            <p className={`max-w-[82%] rounded-[20px] rounded-bl-md px-4 py-2.5 break-words whitespace-pre-wrap ${t.error ? "bg-expense/10" : "bg-card"}`}>
                              {t.text ? <Rich text={t.text.trim()} /> : <Dots />}
                            </p>
                          )}
                        </div>
                        {t === last && !busy && t.suggestions && t.suggestions.length > 0 && left > 0 && (
                          <div className="flex flex-wrap gap-2 pl-9">
                            {t.suggestions.map((s) => (
                              <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line px-3.5 py-1.5 text-sm">{s}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    ),
                  )
                )}
                <div ref={end} />
              </div>

              <form onSubmit={(e) => { e.preventDefault(); ask(question); }} className="-mx-5 flex items-end gap-2 border-t border-line px-5 pt-3">
                <label className="sr-only" htmlFor="ai-question">Sua pergunta</label>
                <textarea
                  id="ai-question"
                  ref={input}
                  value={question}
                  onChange={(e) => { setQuestion(e.target.value); resize(); }}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(question); } }}
                  rows={1}
                  maxLength={500}
                  placeholder={left === 0 ? "Volte amanhã para mais perguntas" : "Pergunte sobre seus gastos..."}
                  disabled={left === 0}
                  className="min-h-12 flex-1 resize-none rounded-3xl bg-card px-4 py-3 outline-none disabled:opacity-60"
                />
                <button disabled={busy || !question.trim() || left === 0} aria-label="Enviar pergunta"
                  className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95 disabled:opacity-40">
                  <ArrowUp size={22} />
                </button>
              </form>
              <p className="mt-2 text-center text-xs text-muted">
                {left} de {limit} perguntas restantes hoje · A IA pode errar: confira no Extrato.
              </p>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}

/** A bolinha com o "N" do NorthFinance */
function Avatar({ size }: { size: number }) {
  return (
    <span aria-hidden className="flex flex-none items-center justify-center rounded-full bg-gradient-to-tr from-[#1e4fd6] to-[#22c55e] font-extrabold text-white"
      style={{ width: size, height: size, fontSize: size * 0.42 }}>
      N
    </span>
  );
}

/** Texto da IA com {-R$ 10,00} em vermelho, {+R$ 10,00} em verde e **negrito**. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\{[+-][^{}\n]{1,60}\}|\*\*[^*\n]{1,80}\*\*)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (/^\{[+-]/.test(part) && part.endsWith("}")) {
          return <b key={i} className={part[1] === "-" ? "text-expense" : "text-income"}>{part.slice(2, -1)}</b>;
        }
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <b key={i}>{part.slice(2, -2)}</b>;
        return part;
      })}
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
