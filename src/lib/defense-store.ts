import type { ReviewedEntry } from "@/src/core/summaries/types";

export type DemoDefenseSession = { id: string; userId: string; entries: ReviewedEntry[]; turns: Array<{ question: string; answer: string | null; topic: string; struggled: boolean }> };
const globalForDefense = globalThis as typeof globalThis & { __siwesDefenseSessions?: Map<string, DemoDefenseSession> };
export const demoDefenseSessions = globalForDefense.__siwesDefenseSessions ?? new Map<string, DemoDefenseSession>();
globalForDefense.__siwesDefenseSessions = demoDefenseSessions;
