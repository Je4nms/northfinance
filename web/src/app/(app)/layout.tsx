// Moldura de todas as telas de dentro do app: brilho da marca no topo e barra embaixo
import { Suspense } from "react";

import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="nf-glow relative isolate">
      {/* No iPhone (iOS 26) a faixa do relógio fica desfocada: o conteúdo começa um pouco abaixo dela.
          Em aparelhos sem essa área (Android, computador), o espaço continua 1.25rem. */}
      <main className="mx-auto max-w-[520px] px-4 pt-[max(1.25rem,calc(env(safe-area-inset-top)+1rem))] pb-32 md:max-w-[960px]">{children}</main>
      {/* A barra lê o endereço da página (para saber a aba ativa), então fica num <Suspense> */}
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
