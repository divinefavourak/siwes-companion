import { prisma } from "@/src/lib/prisma";

async function main() {
  const result = await prisma.siwesProgramme.deleteMany({
    where: { title: "Chaos Engineering Intern" }
  });
  console.log(`Deleted ${result.count} seeded programmes and their entries.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
