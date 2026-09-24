import { prisma } from "@/src/lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err.message);
  await prisma.$disconnect();
  process.exit(1);
});
