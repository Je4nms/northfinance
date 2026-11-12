"use client";
// Janela que sobe por baixo (no computador, aparece no meio). Usada nas contas a vencer e no "Sobrou dinheiro?".
import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

/** Janela que sobe por baixo. Fecha tocando fora, no X ou com Esc. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  // Guarda a função de fechar mais recente sem refazer o efeito (assim o foco não "pula" a cada mudança)
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

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
