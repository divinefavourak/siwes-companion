import { auth } from "@/auth";

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

  if (process.env.NODE_ENV !== "production") {
    return { id: "demo-user", name: "Demo Student", email: "demo@siwes.local" };
  }

  return null;
}
