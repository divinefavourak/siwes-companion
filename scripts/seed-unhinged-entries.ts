import { prisma } from "@/src/lib/prisma";

const unhingedLogs = [
  "Spent 4 hours trying to center a div. The senior dev walked over, added 'display: grid; place-items: center;', and walked away without breaking eye contact. My ego is shattered.",
  "Server went down. We blamed AWS. Turns out the intern unplugged the production rack to charge his vape. Management is currently evaluating if the vape flavor (Blue Razz) was worth the $10k downtime.",
  "Stared at the terminal while 'npm install' downloaded half the internet. Contemplated changing careers to goat farming. Goats probably don't have peer dependency conflicts.",
  "Client asked to make the database 'more blockchain'. I just renamed the SQL tables to include a 'crypto_' prefix. They were ecstatic and said we are 'innovating'. I hate it here.",
  "Attended a 3-hour standup meeting about agile methodologies. We concluded that we need another meeting to discuss the velocity of our previous meetings. Nothing got built.",
  "Refactored the legacy authentication module. Found a comment from 2014 that said '// If this breaks, God help you'. It broke. God did not answer my Slack messages.",
  "Told my supervisor the API rate limit was actually a feature designed to 'throttle overly enthusiastic users' to increase anticipation. He bought it. Promotion imminent.",
  "Spilled coffee on the main office router. Put it in a giant bag of rice. The IT manager just stood there, crying softly. I told him it works for iPhones.",
  "Fixed a critical bug by deleting the feature completely. If there is no code, there are no bugs. Modern problems require modern solutions."
];

async function main() {
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (!admin) throw new Error("No admin user found to attach programme to.");

  const programme = await prisma.siwesProgramme.create({
    data: {
      userId: admin.id,
      title: "Chaos Engineering Intern",
      durationMonths: 6,
      institution: "Unhinged Tech University",
      department: "Computer Science",
      level: "400",
      matricNumber: "UNI/123/456",
      organization: "Chaos Monkey Corp",
      unit: "Engineering",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
    }
  });

  console.log(`Injecting entries into programme: ${programme.institution}`);

  for (let i = 0; i < unhingedLogs.length; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i); // one for each of the last 9 days

    await prisma.entry.create({
      data: {
        programmeId: programme.id,
        workDate: d,
        rawText: unhingedLogs[i],
        rawSource: "WEB",
        status: "DRAFT",
        generationStatus: "NOT_REQUESTED",
      }
    });
  }

  console.log("✅ 9 unhinged log entries successfully injected into the database.");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("❌ ", err.message ?? err);
  await prisma.$disconnect();
  process.exit(1);
});
