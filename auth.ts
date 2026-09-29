import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { env, hasGoogleAuth } from "@/src/lib/env";
import { prisma } from "@/src/lib/prisma";
import { verifyPassword } from "@/src/lib/auth-crypto";
import { consumeWebLoginToken } from "@/src/adapters/telegram/account-service";
import { authConfig } from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
        if (!user || user.deletedAt) return null;
        
        const userPasswordHash = (user as Record<string, unknown> | null)?.passwordHash as string | undefined;
        if (!userPasswordHash) return null;

        const isValid = verifyPassword(password, userPasswordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name ?? "Student",
          email: user.email
        };
      }
    }),
    // One-tap sign-in from the Telegram bot's "Open web" button. The token is single-use,
    // expires in 10 minutes, and is consumed here (a POST), never by loading the page.
    Credentials({
      id: "telegram-link",
      name: "Telegram sign-in link",
      credentials: { token: { label: "Token", type: "text" } },
      async authorize(credentials) {
        const user = await consumeWebLoginToken(String(credentials?.token ?? ""));
        return user ? { id: user.id, name: user.name ?? "Student", email: user.email } : null;
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
  callbacks: {
    // Fetch role from DB on initial sign-in and embed it in the JWT
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true }
        });
        token.role = dbUser?.role ?? "STUDENT";
      }
      return token;
    },
    // Spread session from JWT (no DB call — just reads token fields)
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = ((token.role as string) === "ADMIN" ? "ADMIN" : "STUDENT") as "STUDENT" | "ADMIN";
      }
      return session;
    }
  }
});
