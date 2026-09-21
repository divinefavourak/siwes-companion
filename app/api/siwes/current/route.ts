import { NextResponse } from "next/server";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const programme = await getRepositories().programmes.findActiveByUser(viewer.id);
    return NextResponse.json({ programme });
  } catch (error) {
    return jsonError(error);
  }
}
