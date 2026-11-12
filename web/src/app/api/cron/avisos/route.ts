// Tarefa diária das notificações. A Vercel chama esta rota todo dia às 12h UTC (9h em São Paulo),
// mandando o CRON_SECRET no cabeçalho. Para testar sem mandar nada: ?simular=1 (e ?hoje=AAAA-MM-DD para outra data).
import * as db from "@/lib/db";
import { todayInSaoPaulo } from "@/lib/money";
import { dayContext, pickNotification } from "@/lib/notifications";
import { pushConfigured, pushTo } from "@/lib/push";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }
  if (!pushConfigured() || !(await db.notificationsReady())) {
    return Response.json({ error: "As notificações ainda não foram ativadas." }, { status: 503 });
  }

  const url = new URL(request.url);
  const simulate = url.searchParams.get("simular") === "1";
  const forced = url.searchParams.get("hoje");
  const today = forced && /^\d{4}-\d{2}-\d{2}$/.test(forced) ? new Date(forced + "T00:00:00Z") : todayInSaoPaulo();

  // Agrupa os aparelhos por pessoa
  const byOwner = new Map<string, db.PushSubscriptionRow[]>();
  for (const s of await db.pushSubscriptions()) byOwner.set(s.owner, [...(byOwner.get(s.owner) ?? []), s]);

  const result = { dia: today.toISOString().slice(0, 10), pessoas: byOwner.size, avisos: [] as { tipo: string; titulo: string; texto: string }[], enviados: 0, removidos: 0 };
  for (const [owner, subscriptions] of byOwner) {
    const notification = pickNotification(await dayContext(owner, today));
    if (!notification) continue;
    // A resposta não leva e-mails: só o tipo e o texto de cada aviso
    result.avisos.push({ tipo: notification.kind, titulo: notification.title, texto: notification.body });
    if (simulate) continue;
    const { sent, removed } = await pushTo(subscriptions, notification);
    result.enviados += sent;
    result.removidos += removed;
    if (sent > 0) await db.markNotificationSent(owner, result.dia);
  }
  return Response.json(result);
}
