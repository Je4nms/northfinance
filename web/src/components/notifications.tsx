"use client";
// Notificações no celular: todos os avisos ficam ligados, sem opções. O celular exige um "Permitir" uma vez,
// e o pedido só pode vir de um toque: por isso o app oferece uma vez (na 3ª visita) e deixa ligar/desligar no Menu.
// No iPhone só funciona com o app instalado na Tela de Início.
import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Sheet } from "@/components/sheet";

import { removePushSubscription, savePushSubscription } from "@/app/actions";

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

/** A chave pública vem em base64 "de URL"; o navegador quer os bytes. */
function keyBytes(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function usePush(publicKey: string) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  const check = useCallback(async () => {
    const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    if (!supported) {
      // iPhone no Safari (sem instalar): só funciona depois de "Adicionar à Tela de Início"
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      setState(ios ? "ios-install" : "unsupported");
      return;
    }
    if (Notification.permission === "denied") return setState("denied");
    const registration = await navigator.serviceWorker.getRegistration("/");
    const subscription = await registration?.pushManager.getSubscription();
    setState(subscription && Notification.permission === "granted" ? "on" : "off");
  }, []);

  useEffect(() => {
    // Lê o estado do navegador depois de montar (não existe no servidor)
    const timer = setTimeout(check, 0);
    return () => clearTimeout(timer);
  }, [check]);

  async function enable() {
    setBusy(true);
    try {
      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;
      if ((await Notification.requestPermission()) !== "granted") return await check();
      const subscription =
        (await registration.pushManager.getSubscription()) ??
        (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const saved = await savePushSubscription(JSON.parse(JSON.stringify(subscription)));
      setState(saved ? "on" : "off");
    } catch (err) {
      console.error("notificações:", err);
      await check();
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const subscription = await (await navigator.serviceWorker.getRegistration("/"))?.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscription(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState("off");
    } finally {
      setBusy(false);
    }
  }

  return { state, busy, enable, disable };
}

/** Seção do Menu: só ligar e desligar (todos os avisos vêm juntos, no máximo um por dia). */
export function NotificationsPanel({ publicKey }: { publicKey: string }) {
  const { state, busy, enable, disable } = usePush(publicKey);

  return (
    <div className="space-y-3">
      {state === "loading" && <p className="text-sm text-muted">Verificando...</p>}
      {state === "unsupported" && <p className="text-sm text-muted">Este navegador não recebe notificações.</p>}
      {state === "ios-install" && (
        <p className="rounded-2xl bg-bg p-3 text-sm text-muted">
          No iPhone, as notificações só funcionam com o app instalado: no Safari, toque em <b className="text-fg">Compartilhar</b> e depois em <b className="text-fg">Adicionar à Tela de Início</b>. Depois abra o NorthFinance por lá.
        </p>
      )}
      {state === "denied" && (
        <p className="rounded-2xl bg-bg p-3 text-sm text-muted">
          As notificações estão bloqueadas para o NorthFinance. Libere nos ajustes do celular (Notificações) e volte aqui.
        </p>
      )}
      {(state === "off" || state === "on") && (
        <p className="text-sm text-muted">Contas a vencer, resumo da semana e lembretes. No máximo um por dia, sem mostrar valores.</p>
      )}
      {state === "off" && (
        <button type="button" onClick={enable} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-white disabled:opacity-60">
          <Bell size={18} /> {busy ? "Ativando..." : "Ativar notificações"}
        </button>
      )}
      {state === "on" && (
        <div className="flex items-center gap-3 rounded-2xl bg-bg px-4 py-3">
          <Bell size={18} className="flex-none text-primary" />
          <p className="flex-1 font-semibold">Notificações ligadas</p>
          <button type="button" onClick={disable} disabled={busy} className="flex items-center gap-1.5 text-sm font-semibold text-muted">
            <BellOff size={16} /> Desligar
          </button>
        </div>
      )}
    </div>
  );
}

/** Convite discreto perto das contas a vencer: some se já estiver ativado ou se o aparelho não suportar. */
export function PushHint({ publicKey }: { publicKey: string }) {
  const { state, busy, enable } = usePush(publicKey);
  if (state !== "off") return null;
  return (
    <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-3.5">
      <Bell size={20} className="flex-none text-primary" />
      <p className="flex-1 text-sm">Quer um aviso no celular antes das contas vencerem?</p>
      <button type="button" onClick={enable} disabled={busy} className="rounded-full bg-primary px-3.5 py-2 text-sm font-semibold text-white disabled:opacity-60">
        {busy ? "..." : "Ativar"}
      </button>
    </div>
  );
}

const VISITS = "nf-visitas";
const OFFERED = "nf-avisos-oferecido";

/**
 * Na 3ª vez que a pessoa abre o app, oferece os avisos uma única vez.
 * Se ela tocar em "Agora não" (ou fechar), não aparece de novo; dá para ativar depois pelo Menu.
 */
export function PushOffer({ publicKey }: { publicKey: string }) {
  const { state, busy, enable } = usePush(publicKey);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state !== "off") return;
    try {
      if (localStorage.getItem(OFFERED)) return;
      // Conta uma visita por sessão (abrir o app), não a cada volta para o Início
      if (!sessionStorage.getItem(VISITS)) {
        sessionStorage.setItem(VISITS, "1");
        localStorage.setItem(VISITS, String(Number(localStorage.getItem(VISITS) ?? 0) + 1));
      }
      if (Number(localStorage.getItem(VISITS)) < 3) return;
      localStorage.setItem(OFFERED, "1");
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    } catch {}
  }, [state]);

  if (!open) return null;
  return (
    <Sheet title="Quer receber avisos?" onClose={() => setOpen(false)}>
      <div className="pb-1 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-primary"><Bell size={26} /></span>
        <p className="mt-3 text-muted">Contas a vencer, resumo da semana e lembretes. No máximo um por dia, sem mostrar valores.</p>
        <button type="button" disabled={busy} onClick={async () => { await enable(); setOpen(false); }}
          className="mt-5 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white disabled:opacity-60">
          {busy ? "Ativando..." : "Ativar"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="mt-1 w-full py-3 font-semibold text-muted">Agora não</button>
      </div>
    </Sheet>
  );
}
