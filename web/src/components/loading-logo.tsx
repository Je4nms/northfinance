// Carregamento: a logo com o marcador da bússola girando, "procurando o norte"
import { ANIMATED_LOGO } from "@/components/logo-markup";

const SPINNING_LOGO = ANIMATED_LOGO.replace('class="nf-needle"', 'class="nf-needle-spin"');

export function LoadingLogo({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div role="status" aria-label="Carregando" className={`flex items-center justify-center ${fullScreen ? "h-[70dvh]" : "py-16"}`}>
      <div className="h-16 w-16" dangerouslySetInnerHTML={{ __html: SPINNING_LOGO }} />
    </div>
  );
}
