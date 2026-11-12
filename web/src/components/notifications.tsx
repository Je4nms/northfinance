"use client";
// Notificações no celular: ativar (pede permissão uma vez), escolher os avisos e mandar um de teste.
// No iPhone só funciona com o app instalado na Tela de Início.
import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { removePushSubscription, savePushSubscription, saveNotificationSettings, sendTestNotification } from "@/app/actions";
import type { NotificationSettings } from "@/lib/db";

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

const TYPES: { key: keyof NotificationSettings; label: string; hint: string }[] = [
  { key: "bills", label: "Contas a vencer", hint: "3 dias antes e no dia" },
  { key: "weekly", label: "Resumo da semana", hint: "Aos domingos" },
  { key: "monthly", label: "Fechamento do mês", hint: "Todo dia 1" },
  { key: "payday", label: "Salário chegando", hint: "3 dias antes do salário" },
  { key: "inactive", label: "Lembrete de anotar", hint: "Depois de 5 dias sem anotar nada" },
  { key: "newYear", label: "Metas para o ano novo", hint: "Em dezembro" },
];

/** Seção do Menu: ativar, escolher os avisos, mostrar ou esconder valores e mandar um de teste. */
export function NotificationsPanel({ publicKey, initial }: { publicKey: string; initial: NotificationSettings }) {
  const { state, busy, enable, disable } = usePush(publicKey);
  const [settings, setSettings] = useState(initial);
  const [test, setTest] = useState<string>();

  function toggle(key: keyof NotificationSettings) {
    const next = { ...settings, [key]: !settings[key] };
    setSettings(next);
    saveNotificationSettings(next);
  }

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
      {state === "off" && (
        <>
          <p className="text-sm text-muted">Receba avisos de contas a vencer, o resumo da semana e lembretes. No máximo um por dia.</p>
          <button type="button" onClick={enable} disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-white disabled:opacity-60">
            <Bell size={18} /> {busy ? "Ativando..." : "Ativar notificações"}
          </button>
        </>
      )}
      {state === "on" && (
        <>
          <ul className="divide-y divide-line">
            {TYPES.map((t) => (
              <li key={t.key}>
                <Switch label={t.label} hint={t.hint} checked={settings[t.key]} onChange={() => toggle(t.key)} />
              </li>
            ))}
            <li>
              <Switch label="Mostrar valores" hint="Aparece o valor na tela de bloqueio (ex.: R$ 120,00)" checked={settings.showValues} onChange={() => toggle("showValues")} />
            </li>
          </ul>
          <div className="flex gap-2">
            <button type="button" className="flex-1 rounded-2xl border border-line py-2.5 text-sm font-semibold"
              onClick={async () => { setTest("Enviando..."); const r = await sendTestNotification(); setTest(r.sent ? "Aviso de teste enviado!" : "Não consegui enviar. Tente ativar de novo."); }}>
              Mandar um aviso de teste
            </button>
            <button type="button" onClick={disable} disabled={busy} className="flex items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold text-muted">
              <BellOff size={16} /> Desligar
            </button>
          </div>
          {test && <p className="text-sm text-muted">{test}</p>}
        </>
      )}
    </div>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 py-2.5">
      <span className="flex-1">
        <span className="block font-semibold">{label}</span>
        <span className="text-sm text-muted">{hint}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={onChange} className="peer sr-only" />
      <span aria-hidden className="relative h-7 w-12 flex-none rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:outline-3 peer-focus-visible:outline-primary after:absolute after:top-1 after:left-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5" />
    </label>
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
