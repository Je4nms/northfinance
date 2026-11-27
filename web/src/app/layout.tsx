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
        {/* Antes de desenhar a tela: as escolhas de acessibilidade e se é Black Friday (logo dourada desde o início) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var d=document.documentElement;d.dataset.text=localStorage.getItem('nf-text')||'normal';d.dataset.contrast=localStorage.getItem('nf-contrast')||'normal'}catch(e){}" +
              // Black Friday (mesma regra de lib/black-friday.ts): sexta depois da 4ª quinta de novembro até a segunda
              "try{var t=new Date(new Date().toLocaleDateString('en-CA',{timeZone:'America/Sao_Paulo'})+'T00:00:00Z'),y=t.getUTCFullYear(),w=new Date(Date.UTC(y,10,1)).getUTCDay(),s=Date.UTC(y,10,1+(4-w+7)%7+22),n=Math.round((t-s)/864e5);if(n>=0&&n<=3)document.documentElement.dataset.bf='1'}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
