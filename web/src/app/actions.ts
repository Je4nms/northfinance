"use server";
// Ações que mudam dados. Rodam no servidor: o navegador só manda o formulário.
import { timingSafeEqual } from "node:crypto";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import * as db from "@/lib/db";
import { isGoalIcon } from "@/lib/goals";
import { dayMonth, dueDateIn, firstDueDate, isoDate, parseBRL, shiftMonth, todayInSaoPaulo, toBRL } from "@/lib/money";
import { currentMember, currentUser } from "@/lib/session";

export async function enter() {
  await signIn("google", { redirectTo: "/" });
}

export async function leave() {
  await signOut({ redirectTo: "/entrar" });
}

export type FormState = { error?: string; ok?: string; detail?: string };

// Maior valor aceito num lançamento ou na meta: R$ 1.000.000,00
const MAX_CENTS = 100_000_000;

export async function acceptInvite(_: FormState, form: FormData): Promise<FormState> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  if (await db.inviteAttemptsBlocked(user.email)) {
    return { error: "Muitas tentativas. Espere 15 minutos e tente de novo." };
  }
  const code = String(form.get("code") ?? "").trim().toUpperCase().slice(0, 64);
  const expected = (process.env.INVITE_CODE ?? "").trim().toUpperCase();
  const same = code.length === expected.length && timingSafeEqual(Buffer.from(code), Buffer.from(expected));
  if (!expected || !same) {
    await db.recordFailedInvite(user.email);
    return { error: "Código errado. Peça o código para quem te convidou." };
  }
  await db.addMember(user.email, user.name);
  redirect("/");
}

/** Lê e confere os campos do formulário de lançamento (o mesmo do Anotar e do Editar). */
function readTransaction(form: FormData) {
  const kind: db.Kind = form.get("kind") === "income" ? "income" : "expense";
  const amountCents = parseBRL(String(form.get("amount") ?? ""));
  const category = String(form.get("category") ?? "");
  const description = String(form.get("description") ?? "").trim().slice(0, 100) || null;
  const occurredOn = String(form.get("date") ?? "");
  const allowed = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  if (!amountCents || amountCents <= 0) return { error: "Coloque o valor." };
  if (amountCents > MAX_CENTS) return { error: "Valor alto demais. O máximo é R$ 1.000.000,00." };
  if (!allowed.includes(category)) return { error: "Escolha uma categoria." };
  const day = /^\d{4}-\d{2}-\d{2}$/.test(occurredOn) ? new Date(occurredOn + "T00:00:00Z") : null;
  if (!day || isNaN(day.getTime()) || day > todayInSaoPaulo() || day.getUTCFullYear() < 2000) {
    return { error: "Escolha uma data válida (não pode ser no futuro)." };
  }
  return { data: { kind, amountCents, category, description, occurredOn }, day };
}

export async function addTransaction(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const read = readTransaction(form);
  if (!("data" in read) || !read.data) return { error: read.error };
  await db.addTransaction(member.email, read.data);

  // "Repetir todo mês": vira um gasto fixo, lançado sozinho no mesmo dia dos próximos meses
  if (form.get("repeat") === "on") {
    const day = read.day!;
    const startMonth = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1)).toISOString().slice(0, 10);
    const saved = await db.addRecurring(member.email, { ...read.data, dayOfMonth: day.getUTCDate(), startMonth });
    if (!saved) return { ok: "Salvo, mas os gastos fixos ainda não foram ativados no banco" };
    return { ok: `${read.data.kind === "income" ? "Ganho" : "Gasto"} salvo e repetindo todo dia ${day.getUTCDate()}` };
  }
  return { ok: `${read.data.kind === "income" ? "Ganho" : "Gasto"} salvo` };
}

export async function updateTransaction(id: number, _: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return { error: "Lançamento não encontrado." };
  const read = readTransaction(form);
  if (!("data" in read) || !read.data) return { error: read.error };
  await db.updateTransaction(member.email, id, read.data);
  redirect("/extrato");
}

export async function deleteRecurring(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteRecurring(member.email, id);
  refresh();
}

// --- Contas a vencer ---

export async function addBill(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const amountCents = parseBRL(String(form.get("amount") ?? ""));
  const dueDay = Number(form.get("dueDay"));
  const category = String(form.get("category") ?? "");

  if (!name) return { error: "Dê um nome para a conta (ex.: Luz)." };
  if (!amountCents || amountCents <= 0) return { error: "Coloque o valor." };
  if (amountCents > MAX_CENTS) return { error: "Valor alto demais. O máximo é R$ 1.000.000,00." };
  if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return { error: "Escolha o dia do vencimento (1 a 31)." };
  if (!EXPENSE_CATEGORIES.includes(category)) return { error: "Escolha uma categoria." };

  const firstDue = firstDueDate(todayInSaoPaulo(), dueDay);
  const saved = await db.addBill(member.email, { name, amountCents, category, dueDay, nextDue: isoDate(firstDue) });
  if (!saved) return { error: "As contas a vencer ainda não foram ativadas no banco." };
  refresh();
  return { ok: "Conta salva", detail: `Vence dia ${dayMonth(firstDue)}` };
}

export async function deleteBill(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteBill(member.email, id);
  refresh();
}

export type PayState = { error?: string; done?: { name: string; amountCents: number; nextDue: string } };

/** "Paguei": lança o gasto com o valor confirmado e joga o vencimento para o mês seguinte. */
export async function payBill(id: number, _: PayState, form: FormData): Promise<PayState> {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return { error: "Conta não encontrada." };
  const amountCents = parseBRL(String(form.get("amount") ?? ""));
  if (!amountCents || amountCents <= 0) return { error: "Coloque o valor pago." };
  if (amountCents > MAX_CENTS) return { error: "Valor alto demais. O máximo é R$ 1.000.000,00." };

  const bill = await db.getBill(member.email, id);
  if (!bill) return { error: "Conta não encontrada." };
  const nextDue = dueDateIn(shiftMonth(bill.nextDue, 1), bill.dueDay);
  const paid = await db.payBill(member.email, id, {
    amountCents,
    paidOn: isoDate(todayInSaoPaulo()),
    expectedDue: isoDate(bill.nextDue),
    nextDue: isoDate(nextDue),
  });
  if (!paid) return { error: "Essa conta já foi paga." };
  refresh();
  return { done: { name: bill.name, amountCents, nextDue: dayMonth(nextDue) } };
}

/** Salva quando a pessoa recebe o salário: dia fixo, 5º dia útil ou último dia útil. */
export async function savePayday(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const kind = String(form.get("kind") ?? "");
  if (!["fixed", "fifth_business", "last_business"].includes(kind)) return { error: "Escolha quando você recebe." };
  const day = kind === "fixed" ? Number(form.get("day")) : null;
  if (kind === "fixed" && (!Number.isInteger(day) || day! < 1 || day! > 31)) return { error: "Escolha um dia de 1 a 31." };
  if (!(await db.setPaydayRule(member.email, kind, day))) return { error: "O dia do salário ainda não foi ativado no banco." };
  refresh();
  return { ok: "Dia do salário salvo" };
}

// --- Metas (a pessoa anota quanto guardou; o app não guarda nem movimenta dinheiro) ---

function readGoal(form: FormData) {
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  const icon = String(form.get("icon") ?? "");
  const targetCents = parseBRL(String(form.get("target") ?? ""));
  const place = String(form.get("place") ?? "").trim().slice(0, 60) || null;
  if (!name) return { error: "Dê um nome para a meta (ex.: Viagem)." };
  if (!isGoalIcon(icon)) return { error: "Escolha um ícone." };
  if (!targetCents || targetCents <= 0) return { error: "Quanto você quer juntar?" };
  if (targetCents > MAX_CENTS) return { error: "Valor alto demais. O máximo é R$ 1.000.000,00." };
  return { data: { name, icon, targetCents, place } };
}

export async function addGoal(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const read = readGoal(form);
  if (!read.data) return { error: read.error };
  if (!(await db.addGoal(member.email, read.data))) return { error: "As metas ainda não foram ativadas no banco." };
  refresh();
  return { ok: "Meta criada", detail: `${read.data.name}: juntar ${toBRL(read.data.targetCents)}` };
}

export async function updateGoal(id: number, _: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return { error: "Meta não encontrada." };
  const read = readGoal(form);
  if (!read.data) return { error: read.error };
  await db.updateGoal(member.email, id, read.data);
  refresh();
  return { ok: "Meta atualizada" };
}

export async function deleteGoal(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteGoal(member.email, id);
  refresh();
}

/** "Anotar que guardei" (direction = "in") ou "Anotar que tirei" (direction = "out"). */
export async function addGoalEntry(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const goalId = Number(form.get("goal"));
  const out = form.get("direction") === "out";
  const amountCents = parseBRL(String(form.get("amount") ?? ""));
  const date = String(form.get("date") ?? "");
  const day = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date + "T00:00:00Z") : null;

  if (!amountCents || amountCents <= 0) return { error: "Coloque o valor." };
  if (amountCents > MAX_CENTS) return { error: "Valor alto demais. O máximo é R$ 1.000.000,00." };
  if (!day || isNaN(day.getTime()) || day > todayInSaoPaulo() || day.getUTCFullYear() < 2000) {
    return { error: "Escolha uma data válida (não pode ser no futuro)." };
  }
  const goal = Number.isSafeInteger(goalId) ? await db.goalSaved(member.email, goalId) : null;
  if (!goal) return { error: "Escolha uma meta." };
  if (out && amountCents > goal.savedCents) {
    return { error: `Essa meta tem só ${toBRL(goal.savedCents)} anotados.` };
  }

  await db.addGoalEntry(member.email, goalId, out ? -amountCents : amountCents, date);
  refresh();
  const after = goal.savedCents + (out ? -amountCents : amountCents);
  if (!out && goal.savedCents < goal.targetCents && after >= goal.targetCents) {
    return { ok: "Meta concluída!", detail: `Você juntou ${toBRL(after)} para ${goal.name}` };
  }
  return {
    ok: "Anotado",
    detail: out ? `${toBRL(amountCents)} saiu de ${goal.name}` : `${toBRL(amountCents)} em ${goal.name}`,
  };
}

export async function deleteGoalEntry(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteGoalEntry(member.email, id);
  refresh();
}

export async function deleteTransaction(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteTransaction(member.email, id);
  redirect("/extrato");
}

export async function saveGoal(form: FormData) {
  const member = await currentMember();
  const cents = parseBRL(String(form.get("goal") ?? ""));
  await db.setGoal(member.email, cents > 0 && cents <= MAX_CENTS ? cents : null);
  refresh();
}

export async function sendFeedback(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const message = String(form.get("message") ?? "").trim().slice(0, 1000);
  if (!message) return { error: "Escreva a sua sugestão antes de enviar." };
  await db.addFeedback(member.email, message);
  return { ok: "Sugestão enviada. Obrigado!" };
}

export async function answerEnjoying(answer: "sim" | "sugestao" | "agora_nao") {
  const member = await currentMember();
  await db.setEnjoying(member.email, answer);
  if (answer === "agora_nao") refresh();
  else redirect(answer === "sim" ? "/menu?curtiu=1" : "/menu#sugestao");
}

export async function toggleValues() {
  const jar = await cookies();
  if (jar.get("nf-hide")?.value === "1") jar.delete("nf-hide");
  else jar.set("nf-hide", "1", { maxAge: 60 * 60 * 24 * 365, sameSite: "lax", path: "/" });
  refresh();
}
