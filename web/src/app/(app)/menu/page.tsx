// Menu no estilo "perfil": foto, nome e as opções em blocos
import { ChevronRight, Info, LogOut, MessageSquare, Repeat, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

import { deleteRecurring, leave } from "@/app/actions";
import { CategoryIcon } from "@/components/category-icon";
import { categoryName } from "@/lib/categories";
import * as db from "@/lib/db";
import { toBRL } from "@/lib/money";
import { LoadingLogo } from "@/components/loading-logo";
import { CopyButton, FeedbackForm } from "@/components/menu-client";
import { currentMember } from "@/lib/session";

const APP_URL = process.env.APP_URL ?? "https://northfinancebr.streamlit.app/?embed=true";

export default function Page({ searchParams }: PageProps<"/menu">) {
  return (
    <Suspense fallback={<LoadingLogo fullScreen />}>
      <Menu searchParams={searchParams} />
    </Suspense>
  );
}

async function Menu({ searchParams }: { searchParams: PageProps<"/menu">["searchParams"] }) {
  const member = await currentMember();
  const params = await searchParams;
  const invite =
    "Oi! Estou usando o NorthFinance para organizar minhas finanças. " +
    `Entra com a sua conta Google: ${APP_URL} Código de convite: ${process.env.INVITE_CODE ?? ""}`;
  const card = "space-y-3 rounded-3xl bg-card p-4";
  const recurring = await db.listRecurring(member.email);

  return (
    <div className="nf-fade-in mx-auto max-w-[520px] space-y-4">
      <header className="flex flex-col items-center gap-2 pt-2 pb-2 text-center">
        {member.image ? (
          <img src={member.image} alt="" referrerPolicy="no-referrer" className="h-24 w-24 rounded-full object-cover ring-4 ring-white/15" />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-tr from-[#1e4fd6] to-[#22c55e] text-4xl font-bold text-white">
            {member.firstName[0]?.toUpperCase()}
          </span>
        )}
        <h1 className="text-2xl font-extrabold">{member.name}</h1>
        <p className="text-sm text-muted">{member.email}</p>
      </header>

      {params.curtiu && (
        <p className="rounded-3xl bg-primary/15 p-4 font-semibold">Que bom que você está curtindo! Que tal convidar um amigo?</p>
      )}

      <section className={card}>
        <h2 className="flex items-center gap-2 font-bold"><UserPlus size={18} className="text-primary" /> Convidar alguém</h2>
        <p className="text-sm text-muted">A mensagem já vai com o link e o código de convite.</p>
        <p className="rounded-2xl bg-bg p-3 text-sm">{invite}</p>
        <div className="flex gap-2">
          <CopyButton text={invite} />
          <a href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl bg-primary py-3 text-center font-semibold text-white">
            WhatsApp
          </a>
        </div>
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 font-bold"><Repeat size={18} className="text-primary" /> Gastos fixos</h2>
        {recurring.length === 0 ? (
          <p className="text-sm text-muted">Nenhum ainda. No Anotar, marque "Repetir todo mês" em contas como luz, internet ou assinaturas.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recurring.map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2">
                <CategoryIcon category={r.category} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{r.description || categoryName(r.category)}</p>
                  <p className="text-sm text-muted">Todo dia {r.dayOfMonth} · {toBRL(r.amountCents)}</p>
                </div>
                <form action={deleteRecurring.bind(null, r.id)}>
                  <button aria-label={`Parar de repetir ${r.description || categoryName(r.category)}`} className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-expense">
                    <Trash2 size={18} />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section id="sugestao" className={card}>
        <h2 className="flex items-center gap-2 font-bold"><MessageSquare size={18} className="text-primary" /> Enviar sugestão</h2>
        <FeedbackForm />
      </section>

      <section className={card}>
        <h2 className="flex items-center gap-2 font-bold"><Info size={18} className="text-primary" /> Sobre o NorthFinance</h2>
        <p className="text-sm text-muted">O app de finanças mais simples que existe: anote o que entra e o que sai, e veja para onde o dinheiro está indo.</p>
        <Link href="/privacidade" className="flex items-center justify-between text-sm font-semibold text-primary">Política de Privacidade <ChevronRight size={16} /></Link>
      </section>

      <form action={leave}>
        <button className="flex w-full items-center justify-center gap-2 rounded-3xl border border-line py-3.5 font-semibold text-expense"><LogOut size={18} /> Sair</button>
      </form>
    </div>
  );
}
