/**
 * Creates a new admin user directly in the DB (bypasses sign-up form).
 * Usage: npx tsx scripts/create-admin.ts <email> <name> <password>
 */
import { prisma } from "@/src/lib/prisma";
import { hashPassword } from "@/src/lib/auth-crypto";

async function main() {
  const [, , email, name, password] = process.argv;

  if (!email || !name || !password) {
    console.error("Usage: npx tsx scripts/create-admin.ts <email> <name> <password>");
    process.exit(1);
  }

  const passwordHash = hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

  let user;
  if (existing) {
    user = await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: { role: "ADMIN", name, passwordHash },
      select: { id: true, name: true, email: true, role: true },
    });
    console.log(`✅  Updated existing user → ${user.name} (${user.email}) is now ADMIN.`);
  } else {
    user = await prisma.user.create({
      data: { email: email.toLowerCase(), name, passwordHash, role: "ADMIN" },
      select: { id: true, name: true, email: true, role: true },
    });
    console.log(`✅  Created new admin → ${user.name} (${user.email})`);
  }

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ ", err.message ?? err);
  await prisma.$disconnect();
  process.exit(1);
});
