import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

// Fonte do app: Inter, feita para telas e com números bem fáceis de ler
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NorthFinance",
  description: "O app de finanças mais simples que existe.",
  applicationName: "NorthFinance",
  // No iPhone: "Adicionar à Tela de Início" abre em tela cheia, sem a barra do Safari
  appleWebApp: { capable: true, title: "NorthFinance", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1117" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <head>
        {/* Lê as escolhas de acessibilidade salvas no aparelho antes de desenhar a tela */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;d.dataset.text=localStorage.getItem('nf-text')||'normal';d.dataset.contrast=localStorage.getItem('nf-contrast')||'normal'}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
