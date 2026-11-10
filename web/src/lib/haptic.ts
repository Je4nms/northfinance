/**
 * Vibraçãozinha ao salvar. Android: navigator.vibrate. iPhone (iOS 18+): o Safari não deixa
 * sites vibrarem, mas um "interruptor" invisível sendo ligado faz o iPhone dar um toque.
 */
export function haptic() {
  try {
    navigator.vibrate?.(30);
    const label = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.style.display = "none";
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch {
    // Sem vibração neste aparelho: tudo bem
  }
}
