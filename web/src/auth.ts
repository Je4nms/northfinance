// Login com Google. O Auth.js cuida de tudo: abrir a tela do Google,
// receber a resposta e guardar a sessão num cookie protegido.
// As credenciais vêm das variáveis de ambiente AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET e AUTH_SECRET.
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
});
