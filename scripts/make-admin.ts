/**
 * Promotes a user to ADMIN role.
 * Usage: npx tsx scripts/make-admin.ts <email>
 */
import { prisma } from "@/src/lib/prisma";

const email = process.argv[2];

if (!email) {
  console.error("❌  Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.update({
    where: { email: (email as string).toLowerCase().trim() },
    data: { role: "ADMIN" },
    select: { id: true, name: true, email: true, role: true },
  });

  console.log(`✅  ${user.name ?? user.email} (${user.email}) is now an ADMIN.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ ", err.message ?? err);
  await prisma.$disconnect();
  process.exit(1);
});
