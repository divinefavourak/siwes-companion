import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { env, hasGoogleAuth } from "@/src/lib/env";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.authSecret,
  session: { strategy: "jwt" },
  providers: hasGoogleAuth()
    ? [
        Google({
          clientId: env.googleClientId,
          clientSecret: env.googleClientSecret
        })
      ]
    : [],
  pages: { signIn: "/sign-in" }
  ,callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (session.user) session.user.id = String(token.id ?? token.sub ?? "");
      return session;
    }
  }
});
