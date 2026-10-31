"use client";
// O saldo "conta" de zero até o valor quando a tela abre (meio segundo)
import { useEffect, useState } from "react";

const brl = (cents: number) => (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function AnimatedNumber({ cents, hidden }: { cents: number; hidden: boolean }) {
  const [shown, setShown] = useState(cents);

  useEffect(() => {
    if (hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(cents);
      return;
    }
    const start = performance.now();
    const duration = 600;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // começa rápido e desacelera no fim
      setShown(Math.round(cents * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [cents, hidden]);

  return <>{hidden ? "R$ •••••" : brl(shown)}</>;
}
