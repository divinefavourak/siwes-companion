import { NextResponse } from "next/server";
import { saveEditedEntry } from "@/src/core/entries/entry-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { jsonError } from "@/src/lib/api";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const { id } = await params;
    const body = await request.json();
    const entry = await saveEditedEntry(getRepositories().entries, {
      userId: viewer.id,
      entryId: id,
      editedText: String(body.editedText ?? ""),
      expectedVersion: Number(body.expectedVersion)
    });
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}
