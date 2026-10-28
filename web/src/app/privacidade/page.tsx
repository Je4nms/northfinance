// Política de Privacidade: aberta para qualquer pessoa, sem login (o Google exige)
import Link from "next/link";

import { Brand } from "@/components/brand";

export const metadata = { title: "Política de Privacidade · NorthFinance" };

export default function Page() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-5 py-8 leading-relaxed">
      <Link href="/"><Brand /></Link>
      <h1 className="text-3xl font-extrabold">Política de Privacidade</h1>
      <p><i>Última atualização: 28 de outubro de 2026</i></p>
      <p>O NorthFinance é um projeto pessoal, sem fins lucrativos, feito para eu, minha família e meus amigos organizarmos nossas finanças. Esta página explica, de forma simples, quais dados o app guarda e o que faz com eles.</p>
      <h2 className="pt-2 text-lg font-bold">Quais dados o app guarda</h2>
      <ul className="list-disc space-y-1 pl-5">
      <li><b>Da sua conta Google:</b> o seu <b>nome</b> e o seu <b>e-mail</b>. Eles servem só para saber quem você é e separar os seus lançamentos dos das outras pessoas. O app <b>nunca</b> vê nem guarda a sua senha do Google.</li>
      <li><b>O que você anota:</b> os gastos e ganhos que você digita (valor, categoria, descrição e data).</li>
      </ul>
      <p>O app <b>não</b> se conecta ao seu banco e <b>não</b> acessa nenhum outro dado do seu celular ou da sua conta Google.</p>
      <h2 className="pt-2 text-lg font-bold">Para que os dados são usados</h2>
      <p>Só para mostrar as <b>suas</b> finanças <b>para você</b>. Os dados <b>não</b> são vendidos, <b>não</b> são compartilhados com ninguém e <b>não</b> são usados para anúncios.</p>
      <h2 className="pt-2 text-lg font-bold">Quem consegue ver</h2>
      <ul className="list-disc space-y-1 pl-5">
      <li><b>Você:</b> só os seus próprios lançamentos. Uma pessoa nunca vê os lançamentos de outra dentro do app.</li>
      <li><b>O administrador do app (Jean):</b> por cuidar do banco de dados, tecnicamente tem acesso a ele. Esse acesso é usado apenas para manutenção e correção de problemas.</li>
      </ul>
      <h2 className="pt-2 text-lg font-bold">Onde os dados ficam</h2>
      <ul className="list-disc space-y-1 pl-5">
      <li><b>Banco de dados:</b> <a href="https://neon.com" className="text-primary underline">Neon</a>, num servidor em São Paulo.</li>
      <li><b>Site:</b> <a href="https://streamlit.io/cloud" className="text-primary underline">Streamlit Community Cloud</a>.</li>
      <li><b>Login:</b> feito pelo Google.</li>
      </ul>
      <h2 className="pt-2 text-lg font-bold">Seus direitos</h2>
      <p>Pela Lei Geral de Proteção de Dados (LGPD), você pode pedir a qualquer momento para <b>ver</b>, <b>corrigir</b> ou <b>apagar</b> os seus dados. É só falar com quem te convidou para o NorthFinance, ou abrir um pedido em <a href="https://github.com/Je4nms/northfinance/issues" className="text-primary underline">github.com/Je4nms/northfinance</a>. Os lançamentos também podem ser apagados por você mesmo, no <b>Extrato</b>.</p>
    </main>
  );
}
