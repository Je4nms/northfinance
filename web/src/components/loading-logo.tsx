// Carregamento: a logo com o marcador da bússola girando, "procurando o norte"
import { ANIMATED_LOGO } from "@/components/logo-markup";

/** "Edição Black Friday": só aparece quando o html tem data-bf (sexta a segunda da Black Friday). */
export function BlackFridayBadge() {
  return (
    <span className="nf-bf-only rounded-full bg-[#d4a537] px-3 py-1 text-xs font-bold tracking-wide text-black uppercase">
      Edição Black Friday
    </span>
  );
}

const SPINNING_LOGO = ANIMATED_LOGO.replace('class="nf-needle"', 'class="nf-needle-spin"');

export function LoadingLogo({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div role="status" aria-label="Carregando" className={`flex items-center justify-center ${fullScreen ? "h-[70dvh]" : "py-16"}`}>
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16" dangerouslySetInnerHTML={{ __html: SPINNING_LOGO }} />
        <BlackFridayBadge />
      </div>
    </div>
  );
}
