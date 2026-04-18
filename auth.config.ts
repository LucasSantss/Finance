import type { NextAuthConfig } from "next-auth";

// Configuração leve usada APENAS no middleware (Edge Runtime)
// Sem PrismaAdapter, sem providers completos — só a lógica de sessão
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const PUBLIC_PATHS = ["/login", "/api/auth", "/api/webhooks"];
      const isPublic = PUBLIC_PATHS.some((p) =>
        nextUrl.pathname.startsWith(p)
      );

      if (isPublic) return true;
      if (!isLoggedIn) return false; // redireciona para /login automaticamente
      if (nextUrl.pathname === "/login" && isLoggedIn) {
        return Response.redirect(new URL("/", nextUrl));
      }
      return true;
    },
  },
  providers: [], // providers são registrados apenas em lib/auth.ts (Node.js)
};
