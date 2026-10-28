// "Ficha" do app instalável (PWA): nome, ícones e que ele abre em tela cheia
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NorthFinance",
    short_name: "NorthFinance",
    description: "O app de finanças mais simples que existe.",
    start_url: "/",
    display: "standalone",
    background_color: "#0e1117",
    theme_color: "#0e1117",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
