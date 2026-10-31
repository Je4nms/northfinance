"use client";
// Barra de navegação fixa embaixo, como num app. No computador ela "flutua" no meio.
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Início", icon: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" },
  { href: "/anotar", label: "Anotar", icon: "M12 5v14M5 12h14" },
  { href: "/extrato", label: "Extrato", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6" },
  { href: "/menu", label: "Menu", icon: "M4 6h16M4 12h16M4 18h16" },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:inset-x-auto md:bottom-3 md:left-1/2 md:w-[520px] md:-translate-x-1/2 md:rounded-2xl md:border">
      <ul className="flex justify-around px-2 py-1.5">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[0.8rem] font-semibold transition-colors ${
                  active ? "text-primary" : "text-muted"
                }`}
              >
                <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-primary/15" : ""}`}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d={tab.icon} />
                  </svg>
                </span>
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
