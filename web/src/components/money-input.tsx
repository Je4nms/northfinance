"use client";
// Campo de valor em reais: coloca o ponto do milhar enquanto a pessoa digita ("3500" vira "3.500")
// e aceita só números e uma vírgula. O cursor continua no lugar certo mesmo editando no meio.
import { formatTyping } from "@/lib/money";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "inputMode"> & {
  onValueChange?: (formatted: string) => void;
};

export function MoneyInput({ onValueChange, onInput, ...props }: Props) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      onInput={(e) => {
        const el = e.currentTarget;
        const caret = el.selectionStart ?? el.value.length;
        // Quantos números/vírgula havia antes do cursor: depois de formatar, o cursor volta para depois deles
        const kept = el.value.slice(0, caret).replace(/[^\d,]/g, "").length;
        const formatted = formatTyping(el.value);
        if (formatted !== el.value) {
          el.value = formatted;
          let pos = 0, seen = 0;
          while (pos < formatted.length && seen < kept) {
            if (/[\d,]/.test(formatted[pos])) seen++;
            pos++;
          }
          el.setSelectionRange(pos, pos);
        }
        onValueChange?.(formatted);
        onInput?.(e);
      }}
    />
  );
}
