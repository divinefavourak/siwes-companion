import { auth } from "@/auth";
import { hasGoogleAuth } from "@/src/lib/env";
import { ensureUserExists, prisma } from "@/src/lib/prisma";

export type Viewer = { id: string; name: string; email: string | null };

export async function getViewer(): Promise<Viewer | null> {
  const session = await auth();
  if (session?.user?.id) {
    return {
      id: session.user.id,
      name: session.user.name ?? "Student",
      email: session.user.email ?? null
    };
  }

  // When institutional Google Auth is not configured or in development,
  // allow direct access to the student workspace
  if (!hasGoogleAuth() || process.env.NODE_ENV !== "production") {
    try {
      const existingUser = await prisma.user.findFirst({
        orderBy: { createdAt: "desc" }
      });
      if (existingUser) {
        return {
          id: existingUser.id,
          name: existingUser.name ?? "Student",
          email: existingUser.email ?? null
        };
      }

      const defaultUser = await ensureUserExists("demo-user");
      return {
        id: defaultUser.id,
        name: defaultUser.name ?? "Student",
        email: defaultUser.email ?? null
      };
    } catch {
      return { id: "demo-user", name: "Student", email: null };
    }
  }

  return null;
}

