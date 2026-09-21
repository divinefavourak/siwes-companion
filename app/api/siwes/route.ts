import { NextResponse } from "next/server";
import { createProgramme } from "@/src/core/siwes/siwes-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { jsonError } from "@/src/lib/api";

export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const body = await request.json();
    const programme = await createProgramme(getRepositories().programmes, { ...body, userId: viewer.id });
    return NextResponse.json({ programme }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
