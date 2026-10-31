"use server";
// Ações que mudam dados. Rodam no servidor: o navegador só manda o formulário.
import { timingSafeEqual } from "node:crypto";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signIn, signOut } from "@/auth";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "@/lib/categories";
import * as db from "@/lib/db";
import { parseBRL, todayInSaoPaulo } from "@/lib/money";
import { currentMember, currentUser } from "@/lib/session";

export async function enter() {
  await signIn("google", { redirectTo: "/" });
}

export async function leave() {
  await signOut({ redirectTo: "/entrar" });
}

export type FormState = { error?: string; ok?: string };

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

export async function addTransaction(_: FormState, form: FormData): Promise<FormState> {
  const member = await currentMember();
  const kind = form.get("kind") === "income" ? "income" : "expense";
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

  await db.addTransaction(member.email, { kind, amountCents, category, description, occurredOn });
  return { ok: `${kind === "income" ? "Ganho" : "Gasto"} salvo` };
}

export async function deleteTransaction(id: number) {
  const member = await currentMember();
  if (!Number.isSafeInteger(id)) return;
  await db.deleteTransaction(member.email, id);
  refresh();
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
