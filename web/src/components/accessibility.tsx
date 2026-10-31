"use client";
// Painel de acessibilidade: tamanho do texto e alto contraste.
// A escolha fica salva no aparelho (localStorage) e vale para o app inteiro.
import { Accessibility, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SIZES = [
  { value: "normal", label: "Normal", sample: "text-base" },
  { value: "grande", label: "Grande", sample: "text-lg" },
  { value: "extra", label: "Extra grande", sample: "text-xl" },
] as const;

type Size = (typeof SIZES)[number]["value"];

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Navegação privada pode bloquear o localStorage: a escolha vale só até fechar
  }
}

export function AccessibilityButton({ variant = "icon" }: { variant?: "icon" | "row" }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState<Size>("normal");
  const [contrast, setContrast] = useState(false);

  useEffect(() => {
    const html = document.documentElement;
    setSize((html.dataset.text as Size) || "normal");
    setContrast(html.dataset.contrast === "alto");
  }, [open]);

  function chooseSize(value: Size) {
    setSize(value);
    document.documentElement.dataset.text = value;
    save("nf-text", value);
  }

  function toggleContrast() {
    const next = !contrast;
    setContrast(next);
    document.documentElement.dataset.contrast = next ? "alto" : "normal";
    save("nf-contrast", next ? "alto" : "normal");
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Acessibilidade"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-bg/60 backdrop-blur"
        >
          <Accessibility size={20} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2 text-left font-bold">
          <Accessibility size={18} className="text-primary" /> Acessibilidade
        </button>
      )}

      {/* O painel é desenhado direto no <body>, por cima de tudo (fora da animação da tela) */}
      {open &&
        createPortal(
        <div role="dialog" aria-modal="true" aria-labelledby="a11y-title" className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 md:items-center" onClick={() => setOpen(false)}>
          <div className="nf-fade-in w-full max-w-md space-y-5 rounded-t-3xl bg-bg p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 id="a11y-title" className="text-xl font-extrabold">Acessibilidade</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
                <X size={20} />
              </button>
            </div>

            <fieldset className="space-y-2">
              <legend className="mb-2 font-semibold">Tamanho do texto</legend>
              <div className="grid grid-cols-3 gap-2">
                {SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={size === s.value}
                    onClick={() => chooseSize(s.value)}
                    className={`rounded-2xl border-2 px-2 py-3 font-semibold ${size === s.value ? "border-primary bg-primary/15" : "border-line"}`}
                  >
                    <span className={`block font-extrabold ${s.sample}`}>Aa</span>
                    <span className="text-sm">{s.label}</span>
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="button"
              role="switch"
              aria-checked={contrast}
              onClick={toggleContrast}
              className="flex w-full items-center justify-between gap-4 rounded-2xl bg-card p-4 text-left"
            >
              <span>
                <span className="block font-semibold">Alto contraste</span>
                <span className="text-sm text-muted">Textos e bordas mais fortes, mais fácil de ler no sol.</span>
              </span>
              <span className={`relative h-7 w-12 flex-none rounded-full transition-colors ${contrast ? "bg-primary" : "bg-line"}`}>
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${contrast ? "left-6" : "left-1"}`} />
              </span>
            </button>

            <p className="text-sm text-muted">Fica salvo neste aparelho.</p>
          </div>
        </div>,
          document.body,
        )}
    </>
  );
}
