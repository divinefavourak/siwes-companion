import { NextResponse } from "next/server";
import { createEvidence } from "@/src/core/evidence/evidence-service";
import { getEvidenceRepository } from "@/src/adapters/web/evidence-repositories";
import { getViewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import { jsonError } from "@/src/lib/api";

export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a programme first" } }, { status: 404 });
    const body = await request.json();
    const evidence = await createEvidence(getEvidenceRepository(), { ...body, userId: viewer.id, programmeId: programme.id });
    return NextResponse.json({ evidence }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
    if (!programme) return NextResponse.json({ evidence: [] });
    return NextResponse.json({ evidence: await getEvidenceRepository().list(viewer.id, programme.id) });
  } catch (error) {
    return jsonError(error);
  }
}
