// Assistente de IA do NorthFinance (Claude Sonnet 5.5, da Anthropic).
// A IA não recebe o extrato inteiro: ela usa 3 ferramentas, e cada ferramenta consulta o banco
// só com os dados da própria pessoa (o e-mail vem do login, nunca da IA).
// Nunca é enviado à IA: e-mail, nome ou foto. Só números, categorias, descrições e datas.
import Anthropic from "@anthropic-ai/sdk";

import { categoryName, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import * as db from "@/lib/db";
import { isoDate, toBRL } from "@/lib/money";

const MODEL = "claude-sonnet-5-5";
export const AI_DAILY_LIMIT = 20; // perguntas por pessoa por dia
const MAX_TURNS = 5; // no máximo 5 idas e voltas com as ferramentas por pergunta
const DAY = 86_400_000;
const ALL_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

// --- As 3 ferramentas ---

const period = {
  start_date: { type: "string", description: "Primeiro dia do período, no formato AAAA-MM-DD" },
  end_date: { type: "string", description: "Último dia do período (incluído), no formato AAAA-MM-DD" },
} as const;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "totais_do_periodo",
    description:
      "Soma de ganhos, gastos e dinheiro guardado nas Metas num período, e quanto sobrou " +
      "(ganhos - gastos - guardado). Use para perguntas como 'quanto gastei este mês?' ou 'quanto sobrou em outubro?'.",
    input_schema: { type: "object", properties: { ...period }, required: ["start_date", "end_date"], additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "gastos_por_categoria",
    description: "Quanto foi gasto em cada categoria num período, da maior para a menor. Use para 'em que eu mais gastei?'.",
    input_schema: { type: "object", properties: { ...period }, required: ["start_date", "end_date"], additionalProperties: false },
    eager_input_streaming: true,
  },
  {
    name: "buscar_lancamentos",
    description:
      "Procura lançamentos num período, por texto da descrição (ex.: 'uber', 'ifood'), por categoria e/ou por tipo. " +
      "Devolve a quantidade, a soma e até 30 lançamentos (os mais recentes).",
    input_schema: {
      type: "object",
      properties: {
        ...period,
        texto: { type: "string", description: "Parte da descrição, sem diferenciar maiúsculas. Opcional." },
        categoria: { type: "string", enum: ALL_CATEGORIES.map(categoryName), description: "Opcional." },
        tipo: { type: "string", enum: ["gasto", "ganho"], description: "Opcional." },
      },
      required: ["start_date", "end_date"],
      additionalProperties: false,
    },
    eager_input_streaming: true,
  },
];

/** Confere a entrada da ferramenta (a IA pode errar o formato). Devolve o período ou uma mensagem de erro. */
function readPeriod(input: unknown): { start: Date; end: Date } | string {
  const i = input as { start_date?: unknown; end_date?: unknown };
  const parse = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(v + "T00:00:00Z") : null);
  const start = parse(i?.start_date), last = parse(i?.end_date);
  if (!start || !last || isNaN(start.getTime()) || isNaN(last.getTime())) return "Datas inválidas: use AAAA-MM-DD.";
  if (last < start) return "A data final vem antes da inicial.";
  if (last.getTime() - start.getTime() > 3 * 366 * DAY) return "Período longo demais: use no máximo 3 anos.";
  return { start, end: new Date(last.getTime() + DAY) };
}

async function runTool(email: string, name: string, input: unknown): Promise<{ content: string; isError?: boolean }> {
  const p = readPeriod(input);
  if (typeof p === "string") return { content: p, isError: true };

  if (name === "totais_do_periodo") {
    const [totals, saved] = await Promise.all([db.monthTotals(email, p.start, p.end), db.savedBetween(email, p.start, p.end)]);
    return {
      content: JSON.stringify({
        ganhos: toBRL(totals.income),
        gastos: toBRL(totals.expense),
        guardado_nas_metas: toBRL(saved),
        sobrou: toBRL(totals.income - totals.expense - saved),
      }),
    };
  }

  if (name === "gastos_por_categoria") {
    const rows = await db.expensesByCategory(email, p.start, p.end);
    return { content: JSON.stringify(rows.map((r) => ({ categoria: categoryName(r.category), total: toBRL(r.totalCents) }))) };
  }

  if (name === "buscar_lancamentos") {
    const i = input as { texto?: unknown; categoria?: unknown; tipo?: unknown };
    const text = typeof i.texto === "string" ? i.texto.trim().slice(0, 50) : undefined;
    const category = typeof i.categoria === "string" ? ALL_CATEGORIES.find((c) => categoryName(c) === i.categoria) : undefined;
    if (typeof i.categoria === "string" && !category) return { content: "Categoria desconhecida.", isError: true };
    const kind = i.tipo === "gasto" ? "expense" : i.tipo === "ganho" ? "income" : undefined;
    const found = await db.searchTransactions(email, { start: p.start, end: p.end, text, category, kind, limit: 30 });
    return {
      content: JSON.stringify({
        quantidade: found.total,
        soma: toBRL(found.sumCents),
        lancamentos: found.rows.map((t) => ({
          data: isoDate(t.occurredOn),
          tipo: t.kind === "income" ? "ganho" : "gasto",
          valor: toBRL(t.amountCents),
          categoria: categoryName(t.category),
          descricao: t.description ?? "",
        })),
      }),
    };
  }

  return { content: `Ferramenta desconhecida: ${name}`, isError: true };
}

// --- As regras do assistente ---

function systemPrompt(today: Date): string {
  const weekday = today.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });
  return `Você é o assistente do NorthFinance, um app de finanças pessoais simples. A pessoa anota os ganhos e gastos dela no app e te pergunta sobre eles.

Hoje é ${isoDate(today)} (${weekday}). "Este mês" vai do dia 1 até hoje.

Como responder:
- Em português do Brasil, de forma curta e simples: no máximo 3 frases, ou uma lista curta com "-". Sem títulos.
- Valores sempre como R$ 1.234,56.
- Use sempre as ferramentas para conseguir os números. Nunca invente valores, datas ou lançamentos.
- Se a ferramenta não encontrar nada, diga com clareza que não encontrou (ex.: "Não achei nenhum gasto com viagem em outubro.").
- O dinheiro anotado nas Metas não é gasto: é dinheiro que a pessoa guardou no banco dela.
- Categorias do app: ${ALL_CATEGORIES.map(categoryName).join(", ")}.

Limites:
- Você só consulta. Não consegue criar, editar nem apagar lançamentos; se pedirem, explique que isso é feito pelo próprio app (aba Anotar ou Extrato).
- Não recomende investimentos, produtos ou bancos específicos. Pode explicar conceitos de educação financeira de forma geral.
- Fale só das finanças da pessoa e de educação financeira. Para outros assuntos, diga com gentileza que só ajuda com as finanças no NorthFinance.`;
}

// --- A conversa ---

export type ChatTurn = { role: "user" | "assistant"; text: string };

/**
 * Responde a última pergunta, escrevendo o texto aos poucos em `onText`.
 * A IA pode chamar as ferramentas algumas vezes antes de responder.
 */
export async function answer(email: string, today: Date, history: ChatTurn[], onText: (text: string) => void): Promise<void> {
  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.text }));
  let wroteText = false;
  let jsonRetries = 0;

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      // Se a IA recusar por segurança, a própria API tenta de novo com outro modelo
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low" }, // conversa curta: menos raciocínio, mais rápido e mais barato
      cache_control: { type: "ephemeral" },
      system: systemPrompt(today),
      tools: TOOLS,
      messages,
    });
    stream.on("text", (delta) => {
      wroteText = true;
      onText(delta);
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Só repete quando a entrada de uma ferramenta veio quebrada; erros da API sobem
      if (err instanceof Anthropic.APIError || jsonRetries++ >= 2) throw err;
      continue;
    }

    if (message.stop_reason === "refusal") {
      if (!wroteText) onText("Não consigo ajudar com essa pergunta. Pergunte sobre os seus ganhos e gastos.");
      return;
    }
    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    // Terminou de responder (ou parou por outro motivo, como max_tokens): não roda ferramenta pela metade
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) return;

    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const use of toolUses) {
      const result = await runTool(email, use.name, use.input);
      results.push({ type: "tool_result", tool_use_id: use.id, content: result.content, ...(result.isError ? { is_error: true } : {}) });
    }
    messages.push({ role: "user", content: results });
    if (wroteText) onText("\n\n");
  }
  if (!wroteText) onText("Não consegui terminar essa resposta. Tente perguntar de um jeito mais simples.");
}
