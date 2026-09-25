import { AsyncLocalStorage } from "node:async_hooks";

export interface LlmContext {
  userId?: string;
  programmeId?: string;
  entryId?: string;
  purpose?: string;
}

export const llmContextStorage = new AsyncLocalStorage<LlmContext>();
