import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "demo@siwes.local";
  const user = await prisma.user.upsert({
    where: { email },
    update: { name: "Demo Student" },
    create: { email, name: "Demo Student" }
  });

  await prisma.siwesProgramme.upsert({
    where: { id: "demo-programme" },
    update: {},
    create: {
      id: "demo-programme",
      userId: user.id,
      title: "Software Engineering SIWES",
      durationMonths: 3,
      institution: "Demo University",
      department: "Computer Science",
      level: "300",
      matricNumber: "DEMO/CS/300",
      organization: "Demo Technology Ltd",
      unit: "Product Engineering",
      startDate: new Date("2026-01-05T00:00:00.000Z"),
      endDate: new Date("2026-04-05T00:00:00.000Z")
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
