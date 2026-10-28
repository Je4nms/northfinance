// Menu no estilo "perfil": foto, nome e as opções em blocos
import Link from "next/link";
import { Suspense } from "react";

import { leave } from "@/app/actions";
import { CopyButton, FeedbackForm } from "@/components/menu-client";
import { currentMember } from "@/lib/session";

const APP_URL = process.env.APP_URL ?? "https://northfinancebr.streamlit.app/?embed=true";

export default function Page({ searchParams }: PageProps<"/menu">) {
  return (
    <Suspense>
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

  return (
    <div className="mx-auto max-w-[520px] space-y-4">
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
        <p className="rounded-3xl bg-primary/15 p-4 font-semibold">Que bom que você está curtindo! 💚 Que tal convidar um amigo?</p>
      )}

      <section className={card}>
        <h2 className="font-bold">👋 Convidar alguém</h2>
        <p className="text-sm text-muted">A mensagem já vai com o link e o código de convite.</p>
        <p className="rounded-2xl bg-bg p-3 text-sm">{invite}</p>
        <div className="flex gap-2">
          <CopyButton text={invite} />
          <a href={`https://wa.me/?text=${encodeURIComponent(invite)}`} target="_blank" rel="noreferrer" className="flex-1 rounded-2xl bg-primary py-3 text-center font-semibold text-white">
            WhatsApp
          </a>
        </div>
      </section>

      <section id="sugestao" className={card}>
        <h2 className="font-bold">💬 Enviar sugestão</h2>
        <FeedbackForm />
      </section>

      <section className={card}>
        <h2 className="font-bold">ℹ️ Sobre o NorthFinance</h2>
        <p className="text-sm text-muted">O app de finanças mais simples que existe: anote o que entra e o que sai, e veja para onde o dinheiro está indo.</p>
        <Link href="/privacidade" className="block text-sm font-semibold text-primary">Política de Privacidade ›</Link>
      </section>

      <form action={leave}>
        <button className="w-full rounded-3xl border border-line py-3.5 font-semibold text-expense">Sair</button>
      </form>
    </div>
  );
}
