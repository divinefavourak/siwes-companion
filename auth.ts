import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env, hasGoogleAuth } from "@/src/lib/env";
import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/auth-crypto";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: env.authSecret,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Student Account",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        const user = await prisma.user.findUnique({ where: { email } });
        const userPasswordHash = (user as Record<string, unknown> | null)?.passwordHash as string | undefined;
        if (!user || !userPasswordHash) return null;

        const isValid = verifyPassword(password, userPasswordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name ?? "Student",
          email: user.email
        };
      }
    }),
    ...(hasGoogleAuth()
      ? [
          Google({
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret
          })
        ]
      : [])
  ],
  pages: { signIn: "/sign-in" },
  callbacks: {
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
