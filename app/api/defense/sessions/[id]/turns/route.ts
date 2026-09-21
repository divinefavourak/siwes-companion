import { NextResponse } from "next/server";
import { buildDefenseFeedback, nextGroundedQuestion } from "@/src/core/defense/defense-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { toReviewedEntry } from "@/src/lib/compile-context";
import { demoDefenseSessions } from "@/src/lib/defense-store";
import { prisma } from "@/src/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getViewer();
  if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
  const { id } = await params;
  const body = await request.json() as { answer?: string };
  const answer = String(body.answer ?? "").trim();
  if (!answer) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "Answer is required" } }, { status: 400 });
  if (!process.env.DATABASE_URL) {
    const session = demoDefenseSessions.get(id);
    if (!session || session.userId !== viewer.id) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
    const current = session.turns.at(-1);
    if (!current) return NextResponse.json({ error: { code: "CONFLICT", message: "Session has no active turn" } }, { status: 409 });
    current.answer = answer;
    current.struggled = answer.length < 30;
    if (session.turns.length >= 3) return NextResponse.json({ feedback: buildDefenseFeedback({ turns: session.turns }) });
    const next = nextGroundedQuestion(session.entries, session.entries.slice(0, session.turns.length).map((entry) => entry.id));
    session.turns.push({ question: next.question, answer: null, topic: session.entries[session.turns.length]?.projects[0] ?? "experience", struggled: false });
    return NextResponse.json({ nextQuestion: next.question });
  }
  const session = await prisma.defenseSession.findFirst({ where: { id, programme: { userId: viewer.id }, status: "ACTIVE" }, include: { turns: { orderBy: { position: "asc" } }, programme: true } });
  if (!session) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Session not found" } }, { status: 404 });
  const current = session.turns.at(-1);
  if (!current) return NextResponse.json({ error: { code: "CONFLICT", message: "Session has no active turn" } }, { status: 409 });
  await prisma.defenseTurn.update({ where: { id: current.id }, data: { answer } });
  const entries = (await getRepositories().entries.listForDateRange(viewer.id, session.programmeId, session.programme.startDate.toISOString().slice(0, 10) as `${number}-${number}-${number}`, session.programme.endDate.toISOString().slice(0, 10) as `${number}-${number}-${number}`)).filter((entry) => entry.status === "SAVED").map(toReviewedEntry);
  if (session.turns.length >= 3) {
    const feedback = buildDefenseFeedback({ turns: session.turns.map((turn) => ({ question: turn.question, answer: turn.id === current.id ? answer : turn.answer, topic: "experience", struggled: (turn.id === current.id ? answer : turn.answer ?? "").length < 30 })) });
    await prisma.defenseSession.update({ where: { id }, data: { status: "COMPLETED", endedAt: new Date() } });
    return NextResponse.json({ feedback });
  }
  const next = nextGroundedQuestion(entries, session.turns.map((_turn, index) => entries[index]?.id).filter((value): value is string => Boolean(value)));
  await prisma.defenseTurn.create({ data: { sessionId: id, position: session.turns.length, question: next.question } });
  return NextResponse.json({ nextQuestion: next.question });
}
