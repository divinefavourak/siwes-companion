import { NextResponse } from "next/server";
import { getViewer, type Viewer } from "@/src/lib/viewer";
import { getRepositories } from "@/src/adapters/web/repositories";
import type { Programme } from "@/src/core/siwes/types";

/** Resolves the signed-in student and their active programme, or the error response to return. */
export async function projectContext(): Promise<{ viewer: Viewer; programme: Programme } | { response: NextResponse }> {
  const viewer = await getViewer();
  if (!viewer) {
    return { response: NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 }) };
  }
  const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
  if (!programme) {
    return { response: NextResponse.json({ error: { code: "NOT_FOUND", message: "Create a SIWES programme first" } }, { status: 404 }) };
  }
  return { viewer, programme };
}
