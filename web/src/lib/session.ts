// Quem está usando o app. Toda tela de dentro do app começa chamando currentMember():
// sem login vai para /entrar; sem convite vai para /convite.
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { auth } from "@/auth";
import { isMember } from "@/lib/db";

export type Member = { email: string; name: string; firstName: string; image: string | null };

export async function currentUser(): Promise<Member | null> {
  // Avisa o Next.js que daqui para frente a tela depende de quem está acessando
  await connection();
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;
  const name = session?.user?.name || email;
  return { email, name, firstName: name.split(" ")[0], image: session?.user?.image ?? null };
}

export async function currentMember(): Promise<Member> {
  const user = await currentUser();
  if (!user) redirect("/entrar");
  if (!(await isMember(user.email))) redirect("/convite");
  return user;
}
