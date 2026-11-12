"use client";
// Tour do primeiro acesso: opcional, em poucos passos. Cada passo acende uma parte da tela
// e explica em uma frase. Dá para pular a qualquer momento e rever pelo Menu.
import { Compass } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SEEN = "nf-tour-visto";

const STEPS = [
  { target: "saldo", title: "Sobrou no mês", text: "Tudo o que entrou menos o que você gastou e guardou. É o número mais importante do app." },
  { target: "olho", title: "Esconder valores", text: "Vai abrir o app perto de alguém? Toque no olho e os valores ficam escondidos." },
  { target: "anotar", title: "Anotar", text: "Anote um gasto, um ganho ou uma conta que vence todo mês. Leva poucos segundos." },
  { target: "categorias", title: "Para onde foi o dinheiro", text: "Veja em quais categorias você mais gastou no mês." },
  { target: "extrato", title: "Extrato", text: "Todos os lançamentos, por mês ou pelas datas que quiser. Toque em um para editar." },
  { target: "metas", title: "Metas", text: "Crie metas para os seus sonhos e anote o que for guardando. O dinheiro fica no seu banco: aqui você acompanha." },
  { target: "menu", title: "Menu", text: "Convide alguém, mande sugestões e veja este tour de novo quando quiser." },
];

type Rect = { top: number; left: number; width: number; height: number };

function remember() {
  try {
    localStorage.setItem(SEEN, "1");
  } catch {
    // Sem armazenamento (aba anônima): o convite pode aparecer de novo, tudo bem
  }
}

export function Tour({ autoStart = false }: { autoStart?: boolean }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"off" | "welcome" | "steps">("off");
  const [steps, setSteps] = useState(STEPS);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  // Decide se mostra o convite (só na primeira vez) ou começa direto (veio do Menu)
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(SEEN) === "1";
    } catch {}
    const timer = setTimeout(() => {
      if (autoStart) start();
      else if (!seen) setPhase("welcome");
    }, 600);
    return () => clearTimeout(timer);
  }, [autoStart]);

  function start() {
    // Só os passos cuja parte existe na tela agora (ex.: "Para onde foi o dinheiro" some sem gastos)
    setSteps(STEPS.filter((s) => document.querySelector(`[data-tour="${s.target}"]`)));
    setIndex(0);
    setPhase("steps");
  }

  const finish = useCallback(() => {
    remember();
    setPhase("off");
    if (autoStart) router.replace("/");
  }, [autoStart, router]);

  // Mede a parte da tela do passo atual (e de novo se a tela rolar ou mudar de tamanho)
  const measure = useCallback(() => {
    const el = document.querySelector(`[data-tour="${steps[index]?.target}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [steps, index]);

  useEffect(() => {
    if (phase !== "steps") return;
    const el = document.querySelector(`[data-tour="${steps[index]?.target}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const timer = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && finish();
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
      document.removeEventListener("keydown", onKey);
    };
  }, [phase, steps, index, measure, finish]);

  if (phase === "off") return null;

  if (phase === "welcome") {
    return createPortal(
      <div className="nf-backdrop fixed inset-0 z-[80] flex items-end justify-center bg-black/55 md:items-center">
        <div role="dialog" aria-modal="true" aria-labelledby="tour-title" tabIndex={-1} ref={(el) => el?.focus()} style={{ outline: "none" }} className="nf-sheet w-full max-w-md rounded-t-[28px] bg-bg px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center md:rounded-[28px]">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"><Compass size={28} /></span>
          <h2 id="tour-title" className="mt-4 text-xl font-extrabold">Bem-vindo ao NorthFinance</h2>
          <p className="mt-1 text-muted">Quer um tour rápido pelo app? Leva menos de um minuto.</p>
          <button type="button" onClick={start} className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white">
            Ver o tour
          </button>
          <button type="button" onClick={finish} className="mt-2 w-full py-3 font-semibold text-muted">
            Agora não
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  const step = steps[index];
  if (!step) return null;
  const last = index === steps.length - 1;
  const pad = 8;
  const vw = typeof window === "undefined" ? 390 : window.innerWidth;
  const vh = typeof window === "undefined" ? 844 : window.innerHeight;
  const cardWidth = Math.min(360, vw - 32);
  const below = rect ? rect.top + rect.height / 2 < vh / 2 : true;
  const cardTop = rect ? (below ? rect.top + rect.height + pad + 14 : undefined) : vh / 2 - 90;
  const cardBottom = rect && !below ? vh - rect.top + pad + 14 : undefined;
  const cardLeft = rect ? Math.min(Math.max(16, rect.left + rect.width / 2 - cardWidth / 2), vw - cardWidth - 16) : (vw - cardWidth) / 2;

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-labelledby="tour-step-title">
      {/* Área clicável escura: tocar fora não fecha, para não sair do tour sem querer */}
      <div className="absolute inset-0" />
      {rect && (
        <div
          aria-hidden
          className="nf-spotlight pointer-events-none absolute rounded-2xl"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgb(0 0 0 / 0.68), 0 0 0 2px var(--primary)",
          }}
        />
      )}
      <div
        key={index}
        ref={(el) => el?.focus()}
        tabIndex={-1}
        className="nf-fade-in absolute rounded-3xl bg-bg p-5 shadow-2xl ring-1 ring-line"
        style={{ outline: "none", width: cardWidth, left: cardLeft, top: cardTop, bottom: cardBottom }}
      >
        <p className="text-xs font-semibold tracking-wide text-primary uppercase">{index + 1} de {steps.length}</p>
        <h2 id="tour-step-title" className="mt-1 text-lg font-extrabold">{step.title}</h2>
        <p className="mt-1 text-muted">{step.text}</p>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={finish} className="px-2 py-2.5 font-semibold text-muted">Pular</button>
          <span className="flex-1" />
          {index > 0 && (
            <button type="button" onClick={() => setIndex(index - 1)} className="rounded-xl border border-line px-4 py-2.5 font-semibold">Voltar</button>
          )}
          <button type="button" onClick={() => (last ? finish() : setIndex(index + 1))} className="rounded-xl bg-primary px-5 py-2.5 font-semibold text-white">
            {last ? "Concluir" : "Próximo"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
