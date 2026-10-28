// A logo como texto, para poder animar o marcador do norte com CSS (classe nf-needle)
export const ANIMATED_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" role="img" aria-label="NorthFinance">
  <defs>
    <linearGradient id="nf-gradient" x1="0" y1="1" x2="1" y2="0">
      <stop offset="0" stop-color="#1e4fd6"/>
      <stop offset="1" stop-color="#22c55e"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="46" fill="url(#nf-gradient)"/>
  <circle cx="100" cy="104" r="62" fill="none" stroke="#fff" stroke-width="10"/>
  <g class="nf-needle"><polygon points="100,22 116,48 84,48" fill="#fff"/></g>
  <rect x="72" y="76" width="16" height="56" rx="3" fill="#fff"/>
  <polygon points="72,76 88,76 128,132 112,132" fill="#fff"/>
  <rect x="112" y="76" width="16" height="56" rx="3" fill="#fff"/>
</svg>`;
