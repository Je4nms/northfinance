"use client";
// Confirmação animada: um ✓ verde no meio da tela, com o título e um detalhe embaixo, que some sozinho.
import { Check } from "lucide-react";
import { useEffect } from "react";

export function Celebrate({ title, detail, onEnd }: { title: string; detail?: string; onEnd: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onEnd, 1800);
    return () => clearTimeout(timer);
  }, [onEnd]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center">
      <div className="nf-pop flex flex-col items-center gap-3 rounded-3xl bg-bg/95 px-8 py-6 shadow-2xl ring-1 ring-line">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-income text-white">
          <Check size={36} strokeWidth={3} className="nf-check" />
        </span>
        <div className="text-center">
          <p className="font-bold">{title}</p>
          {detail && <p className="text-sm text-muted">{detail}</p>}
        </div>
      </div>
    </div>
  );
}
