// Editar um lançamento: o mesmo formulário do Anotar, já preenchido, e o botão de apagar
import { ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { deleteTransaction } from "@/app/actions";
import { LoadingLogo } from "@/components/loading-logo";
import { TransactionForm } from "@/components/transaction-form";
import * as db from "@/lib/db";
import { isoDate, todayInSaoPaulo } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page({ params }: PageProps<"/lancamento/[id]">) {
  return (
    <div className="nf-fade-in space-y-5">
      <Link href="/extrato" className="inline-flex items-center gap-1 font-semibold text-muted">
        <ChevronLeft size={20} /> Extrato
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Editar lançamento</h1>
      <Suspense fallback={<LoadingLogo />}>
        <Edit params={params} />
      </Suspense>
    </div>
  );
}

async function Edit({ params }: { params: PageProps<"/lancamento/[id]">["params"] }) {
  const member = await currentMember();
  const id = Number((await params).id);
  const t = Number.isSafeInteger(id) ? await db.getTransaction(member.email, id) : null;
  if (!t) notFound();

  return (
    <div className="space-y-4">
      <TransactionForm
        today={isoDate(todayInSaoPaulo())}
        editId={t.id}
        initial={{
          kind: t.kind,
          amount: (t.amountCents / 100).toFixed(2).replace(".", ","),
          category: t.category,
          description: t.description ?? "",
          date: isoDate(t.occurredOn),
        }}
      />
      <form action={deleteTransaction.bind(null, t.id)}>
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-line py-3.5 font-semibold text-expense">
          <Trash2 size={18} /> Apagar lançamento
        </button>
      </form>
    </div>
  );
}
