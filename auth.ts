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
});
