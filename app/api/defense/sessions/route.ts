import { NextResponse } from "next/server";
import { nextGroundedQuestion } from "@/src/core/defense/defense-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { toReviewedEntry } from "@/src/lib/compile-context";
import { demoDefenseSessions } from "@/src/lib/defense-store";
import { prisma } from "@/src/lib/prisma";

export async function POST() {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  const repositories = getRepositories();
  const programme = await repositories.programmes.findActiveByUser(viewer.id);
  if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a programme first" } }, { status: 404 });
  const entries = (await repositories.entries.listForDateRange(viewer.id, programme.id, programme.startDate, programme.endDate)).filter((entry) => entry.status === "SAVED").map(toReviewedEntry);
  const question = nextGroundedQuestion(entries, []);
  if (process.env.DATABASE_URL) {
    const session = await prisma.defenseSession.create({ data: { programmeId: programme.id, turns: { create: { position: 0, question: question.question } } }, include: { turns: true } });
    return NextResponse.json({ session: { id: session.id, question: question.question } });
  }
  const session = { id: crypto.randomUUID(), userId: viewer.id, entries, turns: [{ question: question.question, answer: null, topic: entries[0]?.projects[0] ?? "experience", struggled: false }] };
  demoDefenseSessions.set(session.id, session);
  return NextResponse.json({ session: { id: session.id, question: question.question } });
}
