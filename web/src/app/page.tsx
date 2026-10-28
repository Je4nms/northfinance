// Fase 1 da versão 2: entrar com Google e ver os lançamentos do mês,
// vindos do mesmo banco da versão 1. O visual caprichado vem nas próximas fases.
import { Suspense } from "react";

import { auth, signIn, signOut } from "@/auth";
import { isMember, listTransactions } from "@/lib/db";
import { monthName, monthRange, toBRL } from "@/lib/money";

// A página lê o login de quem está acessando, então ela é montada a cada visita.
// O <Suspense> mostra a logo enquanto isso.
export default function Page() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-dvh items-center justify-center">
          <img src="/logo.svg" alt="" className="h-16 w-16 animate-pulse" />
        </main>
      }
    >
      <Home />
    </Suspense>
  );
}

async function Home() {
  const session = await auth();

  if (!session?.user?.email) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
        <img src="/logo.svg" alt="" className="h-24 w-24" />
        <h1 className="text-3xl font-extrabold">NorthFinance</h1>
        <p className="text-neutral-500">O app de finanças mais simples que existe.</p>
        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
          className="w-full"
        >
          <button className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Entrar com Google</button>
        </form>
      </main>
    );
  }

  const email = session.user.email.toLowerCase();
  const signOutForm = (
    <form
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <button className="text-sm text-neutral-500 underline">Sair</button>
    </form>
  );

  if (!(await isMember(email))) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-6">
        <p>
          Olá, <b>{session.user.name}</b>! Esta conta ainda não tem convite. Por enquanto, o código de convite é usado no
          app da versão 1.
        </p>
        {signOutForm}
      </main>
    );
  }

  const today = new Date();
  const [start, end] = monthRange(today);
  const transactions = await listTransactions(email, start, end);
  const total = transactions.reduce((sum, t) => sum + (t.kind === "income" ? t.amountCents : -t.amountCents), 0);

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Olá, {session.user.name?.split(" ")[0]}</h1>
        {signOutForm}
      </header>
      <section>
        <p className="text-sm text-neutral-500">Sobrou em {monthName(start)}</p>
        <p className="text-4xl font-extrabold">{toBRL(total)}</p>
      </section>
      <ul className="divide-y divide-neutral-200 dark:divide-neutral-800">
        {transactions.map((t) => (
          <li key={t.id} className="flex items-center justify-between py-3">
            <div>
              <p className="font-semibold">{t.description || t.category}</p>
              <p className="text-sm text-neutral-500">
                {t.category} · {t.occurredOn.toLocaleDateString("pt-BR", { timeZone: "UTC" })}
              </p>
            </div>
            <p className={t.kind === "income" ? "text-emerald-600" : "text-red-500"}>
              {t.kind === "income" ? "+" : "-"} {toBRL(t.amountCents)}
            </p>
          </li>
        ))}
      </ul>
      {transactions.length === 0 && <p className="text-neutral-500">Nada anotado neste mês ainda.</p>}
    </main>
  );
}
