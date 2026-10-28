import { Suspense } from "react";

import { AddForm } from "@/components/add-form";
import { Brand } from "@/components/brand";
import { isoDate, todayInSaoPaulo } from "@/lib/money";
import { currentMember } from "@/lib/session";

export default function Page() {
  return (
    <div className="space-y-5">
      <Brand />
      <h1 className="text-3xl font-extrabold tracking-tight">Anotar</h1>
      <Suspense>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  await currentMember();
  return <AddForm today={isoDate(todayInSaoPaulo())} />;
}
