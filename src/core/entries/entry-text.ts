import type { Entry } from "@/src/core/entries/types";

/**
 * The polished text the student is looking at: their saved edit once the entry is SAVED,
 * otherwise the newest AI draft. Re-capturing a note keeps an older saved edit while a new
 * draft is prepared, so every view (and every Save button) must pick the same one.
 * Returns null when there is neither a draft nor an edit yet; callers choose the fallback.
 */
export function currentEntryText(entry: Pick<Entry, "status" | "generatedText" | "editedText">): string | null {
  if (entry.status === "SAVED") return entry.editedText ?? entry.generatedText;
  return entry.generatedText ?? entry.editedText;
}
