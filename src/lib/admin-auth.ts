import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { AppError } from "@/src/core/shared/errors";

export type AdminViewer = { userId: string; name: string; email: string | null };

/**
 * Call at the top of every admin Server Component and API route handler.
 */
export async function requireAdmin(): Promise<AdminViewer> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  // Refresh user state from database to catch demotions and deletions immediately
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, deletedAt: true, name: true, email: true },
  });

  if (!dbUser || dbUser.deletedAt) {
    // If they were deleted, log them out effectively by forcing them away
    redirect("/sign-in");
  }

  if (dbUser.role !== "ADMIN") {
    // Hide the admin panel completely from non-admins
    notFound();
  }

  return {
    userId: session.user.id,
    name: dbUser.name ?? "Admin",
    email: dbUser.email ?? null,
  };
}
