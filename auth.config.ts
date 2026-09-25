/**
 * Edge-safe NextAuth configuration.
 * MUST NOT import anything that uses node: protocol modules (node:crypto, prisma, etc.).
 * This file is imported by middleware.ts which runs in the Edge Runtime.
 * The full auth config (with Credentials provider, Prisma, etc.) lives in auth.ts.
 */
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    // Propagate id and role from JWT into session (no DB call — reads from token)
    session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.role = ((token.role as string) === "ADMIN" ? "ADMIN" : "STUDENT") as "STUDENT" | "ADMIN";
      }
      return session;
    },
  },
  // Providers are intentionally empty here — added in auth.ts
  providers: [],
};
