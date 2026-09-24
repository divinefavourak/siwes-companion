import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";

export type AdminViewer = { userId: string; name: string; email: string | null };

/**
 * Call at the top of every admin Server Component and API route handler.
 *
 * - Unauthenticated → redirects to /sign-in?callbackUrl=/admin
 * - Authenticated but not ADMIN → surfaces as 404 (hides admin panel from students)
 * - Authenticated ADMIN → returns the viewer's basic identity
 */
export async function requireAdmin(): Promise<AdminViewer> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    notFound();
  }

  return {
    userId: session.user.id,
    name: session.user.name ?? "Admin",
    email: session.user.email ?? null,
  };
}
