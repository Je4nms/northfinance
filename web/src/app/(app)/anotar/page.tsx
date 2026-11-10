import { Suspense } from "react";

import { TransactionForm } from "@/components/transaction-form";
import { Brand } from "@/components/brand";
import { LoadingLogo } from "@/components/loading-logo";
import * as db from "@/lib/db";
import { isoDate, todayInSaoPaulo } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page({ searchParams }: PageProps<"/anotar">) {
  return (
    <div className="nf-fade-in space-y-5">
      <Brand />
      <h1 className="text-3xl font-extrabold tracking-tight">Anotar</h1>
      <Suspense fallback={<LoadingLogo />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/anotar">["searchParams"] }) {
  const member = await currentMember();
  const params = await searchParams;
  const bills = await db.listBills(member.email);
  return (
    <TransactionForm
      today={isoDate(todayInSaoPaulo())}
      startKind={params.tipo === "conta" ? "bill" : undefined}
      bills={bills.map(({ id, name, amountCents, category, dueDay }) => ({ id, name, amountCents, category, dueDay }))}
    />
  );
}
