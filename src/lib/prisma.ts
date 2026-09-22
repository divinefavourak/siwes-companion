import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export async function ensureUserExists(userId: string) {
  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (existing) return existing;

  if (userId === "demo-user") {
    const existingByEmail = await prisma.user.findUnique({ where: { email: "demo@siwes.local" } });
    if (existingByEmail) {
      await prisma.user.delete({ where: { id: existingByEmail.id } });
    }
    return prisma.user.create({
      data: {
        id: "demo-user",
        name: "Demo Student",
        email: "demo@siwes.local"
      }
    });
  }

  return prisma.user.create({
    data: {
      id: userId,
      name: "Student"
    }
  });
}
