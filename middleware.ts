/**
 * Middleware — runs in Edge Runtime.
 * Only imports auth.config.ts (edge-safe, no node: modules).
 * Never imports auth.ts directly (that pulls in prisma + node:crypto).
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Guard all /admin/** routes
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signIn);
    }
    // Role check — surface as 404 to hide admin panel from students
    if (req.auth.user?.role !== "ADMIN") {
      return NextResponse.rewrite(new URL("/not-found", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*"],
};
