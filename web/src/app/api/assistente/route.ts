// Rota do assistente de IA. Recebe a conversa e devolve a resposta aos poucos (streaming),
// uma linha JSON por evento: {"t":"text"}, {"t":"status"}, {"t":"suggestions"} ou {"t":"error"}.
// Antes de chamar a IA confere: login, convite, se a IA está ativada, o consentimento e o limite do dia.
import Anthropic from "@anthropic-ai/sdk";

import { AI_DAILY_LIMIT, answer, type ChatEvent, type ChatTurn } from "@/lib/assistant";
import * as db from "@/lib/db";
import { todayInSaoPaulo } from "@/lib/money";
import { currentUser } from "@/lib/session";

const MAX_QUESTION = 500; // caracteres por pergunta
const MAX_HISTORY = 8; // a IA vê só as últimas 8 mensagens da conversa

const fail = (status: number, message: string) => Response.json({ error: message }, { status });

/** Confere a conversa que veio do navegador: só texto, papéis certos e tamanhos limitados. */
function readHistory(body: unknown): ChatTurn[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 40) return null;
  const turns: ChatTurn[] = [];
  for (const m of raw.slice(-MAX_HISTORY)) {
    const role = (m as { role?: unknown })?.role;
    const text = (m as { text?: unknown })?.text;
    if ((role !== "user" && role !== "assistant") || typeof text !== "string" || !text.trim()) return null;
    turns.push({ role, text: text.slice(0, role === "user" ? MAX_QUESTION : 4000) });
  }
  while (turns.length && turns[0].role !== "user") turns.shift(); // a conversa precisa começar pela pessoa
  return turns.length && turns[turns.length - 1].role === "user" ? turns : null;
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return fail(401, "Entre na sua conta para usar o assistente.");
  if (!(await db.isMember(user.email))) return fail(403, "Você precisa de um convite para usar o app.");
  if (!process.env.ANTHROPIC_API_KEY || !(await db.aiReady())) return fail(503, "O assistente ainda não foi ativado.");
  if (!(await db.hasAiConsent(user.email))) return fail(403, "Aceite o aviso de privacidade para usar o assistente.");

  const history = readHistory(await request.json().catch(() => null));
  if (!history) return fail(400, "Pergunta inválida.");
  if ((await db.aiQuestionsToday(user.email)) >= AI_DAILY_LIMIT) {
    return fail(429, `Você já fez as ${AI_DAILY_LIMIT} perguntas de hoje. Amanhã tem mais!`);
  }
  await db.recordAiQuestion(user.email);

  const encoder = new TextEncoder();
  const body = new ReadableStream({
    async start(controller) {
      const send = (event: ChatEvent | { t: "error"; text: string }) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        await answer(user.email, todayInSaoPaulo(), history, send);
      } catch (err) {
        // Mensagens simples para a pessoa; o detalhe fica só no log do servidor
        console.error("assistente:", err);
        const message =
          err instanceof Anthropic.AuthenticationError ? "O assistente está com a chave da IA errada. Avise quem cuida do app."
          : err instanceof Anthropic.RateLimitError ? "Muita gente perguntando agora. Tente de novo em alguns segundos."
          : err instanceof Anthropic.APIError && err.status === 400 ? "O assistente não conseguiu entender essa pergunta."
          : "O assistente não conseguiu responder agora. Tente de novo.";
        send({ t: "error", text: message });
      } finally {
        controller.close();
      }
    },
  });
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
