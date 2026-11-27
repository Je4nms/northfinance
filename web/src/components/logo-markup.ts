// A logo como texto, para poder animar o marcador do norte com CSS (classe nf-needle).
// As classes nf-logo-* deixam o CSS pintar a logo de preto e dourado na Black Friday (html[data-bf]).
export const ANIMATED_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="NorthFinance">
  <defs>
    <linearGradient id="nf-gradient" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#1e4fd6"/>
      <stop offset="1" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect class="nf-logo-bg" width="200" height="200" rx="46" fill="url(#nf-gradient)"/>
  <rect class="nf-logo-border" x="3" y="3" width="194" height="194" rx="43" fill="none" stroke="none" stroke-width="6"/>
  <circle class="nf-logo-ring" cx="100" cy="104" r="62" fill="none" stroke="#fff" stroke-width="10"/>
  <g class="nf-needle"><polygon class="nf-logo-mark" points="100,22 116,48 84,48" fill="#fff"/></g>
  <rect class="nf-logo-mark" x="72" y="76" width="16" height="56" rx="3" fill="#fff"/>
  <polygon class="nf-logo-mark" points="72,76 88,76 128,132 112,132" fill="#fff"/>
  <rect class="nf-logo-mark" x="112" y="76" width="16" height="56" rx="3" fill="#fff"/>
</svg>`;
