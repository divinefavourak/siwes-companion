import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";

export type Viewer = { id: string; name: string; email: string | null; role: "STUDENT" | "ADMIN" };

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (session?.user?.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { deletedAt: true, name: true, email: true, role: true },
    });

    if (!dbUser || dbUser.deletedAt) {
      return null;
    }

    return {
      id: session.user.id,
      name: dbUser.name ?? "Student",
      email: dbUser.email ?? null,
      role: dbUser.role,
    };
  }

  return null;
}
