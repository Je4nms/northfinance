"use client";
// Logo + nome, no topo das telas. Na Black Friday (sexta a segunda) vira a versão preta e dourada.
import { useEffect, useSyncExternalStore } from "react";

import { blackFridayOf } from "@/lib/black-friday";
import { todayInSaoPaulo } from "@/lib/money";

const noop = () => () => {};
// false no servidor (a tela pronta não sabe a data); no navegador, confere o dia de hoje em São Paulo
export const useBlackFriday = () => useSyncExternalStore(noop, () => blackFridayOf(todayInSaoPaulo()) !== null, () => false);

export function Brand() {
  const bf = useBlackFriday();
  return (
    <div className="flex items-center gap-2.5">
      <img src={bf ? "/logo-black-friday.svg" : "/logo.svg"} alt="" className="h-9 w-9" />
      <span className="text-xl tracking-tight">
        <b className="font-extrabold">North</b>Finance
        {bf && <span className="ml-2 rounded-full bg-[#d4a537] px-2 py-0.5 align-middle text-[0.65rem] font-bold tracking-wide text-black uppercase">Edição Black Friday</span>}
      </span>
    </div>
  );
}

/** Liga o brilho dourado das telas (CSS: html[data-bf]) durante a Black Friday. */
export function BlackFridayTheme() {
  const bf = useBlackFriday();
  // Quem decide primeiro é o script do <head> (app/layout.tsx), antes de desenhar; aqui só garante.
  // Não apaga o data-bf: na primeira passada o React ainda não sabe a data e apagaria por engano (a logo "piscaria").
  useEffect(() => {
    if (bf) document.documentElement.dataset.bf = "1";
  }, [bf]);
  return null;
}
