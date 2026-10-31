// Moldura de todas as telas de dentro do app: brilho da marca no topo e barra embaixo
import { Suspense } from "react";

import { BottomNav } from "@/components/bottom-nav";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="nf-glow relative isolate">
      <main className="mx-auto max-w-[520px] px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32 md:max-w-[960px]">{children}</main>
      {/* A barra lê o endereço da página (para saber a aba ativa), então fica num <Suspense> */}
      <Suspense>
        <BottomNav />
      </Suspense>
    </div>
  );
}
