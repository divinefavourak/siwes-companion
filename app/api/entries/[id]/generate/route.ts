import { NextResponse } from "next/server";
import { generateEntry } from "@/src/core/entries/entry-service";
import { getRepositories } from "@/src/adapters/web/repositories";
import { getViewer } from "@/src/lib/viewer";
import { getDailyGenerator } from "@/src/lib/daily-generator";
import { llmContextStorage } from "@/src/lib/llm-context";
import { jsonError } from "@/src/lib/api";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const viewer = await getViewer();
    if (!viewer) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Sign in required" } }, { status: 401 });
    const { id } = await params;
    const entry = await llmContextStorage.run(
      { userId: viewer.id, entryId: id, purpose: "daily-entry-generation" },
      () => generateEntry(getRepositories().entries, getDailyGenerator(), viewer.id, id)
    );
    return NextResponse.json({ entry });
  } catch (error) {
    return jsonError(error);
  }
}
