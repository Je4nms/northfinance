import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Regras de segurança que o site manda para o navegador em toda página.
// "Política de Segurança de Conteúdo" (CSP): de onde o app pode carregar coisas.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Fotos de perfil do Google
  "img-src 'self' blob: data: https://*.googleusercontent.com",
  "font-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  // Formulários só podem mandar dados para o próprio app (e para o login do Google)
  "form-action 'self' https://accounts.google.com",
  // Ninguém pode colocar o NorthFinance dentro de outro site (protege contra "clickjacking")
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // O app não usa câmera, microfone nem localização: fica tudo bloqueado
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Sempre HTTPS (conexão criptografada) por 2 anos
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
