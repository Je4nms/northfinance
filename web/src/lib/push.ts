// Envio das notificações (Web Push). As chaves VAPID provam para o celular que o aviso veio do NorthFinance.
// Ficam nas variáveis de ambiente: VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.
import { sendNotification, WebPushError } from "web-push";

import * as db from "@/lib/db";

const SUBJECT = "https://northfinance.vercel.app";

export const pushConfigured = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

export type PushMessage = { title: string; body: string; url: string };

/** Manda para todos os aparelhos da pessoa. Apaga os que não existem mais. Devolve quantos receberam. */
export async function pushTo(subscriptions: db.PushSubscriptionRow[], message: PushMessage): Promise<{ sent: number; removed: number }> {
  let sent = 0, removed = 0;
  for (const s of subscriptions) {
    try {
      await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(message), {
        vapidDetails: { subject: SUBJECT, publicKey: process.env.VAPID_PUBLIC_KEY!, privateKey: process.env.VAPID_PRIVATE_KEY! },
        TTL: 12 * 60 * 60, // se o celular estiver desligado, o aviso espera até 12 horas
      });
      sent++;
    } catch (err) {
      // 404/410: o aparelho cancelou ou trocou (desinstalou o app, limpou o navegador...)
      if (err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410)) {
        await db.deleteExpiredSubscription(s.id);
        removed++;
      } else {
        console.error("push:", err instanceof WebPushError ? err.statusCode : err);
      }
    }
  }
  return { sent, removed };
}
