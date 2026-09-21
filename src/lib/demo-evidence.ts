import type { EvidenceRecord, EvidenceRepository } from "@/src/core/evidence/evidence-service";
import { AppError } from "@/src/core/shared/errors";

const globalForEvidence = globalThis as typeof globalThis & { __siwesEvidence?: EvidenceRecord[] };
const evidence = globalForEvidence.__siwesEvidence ?? [];
globalForEvidence.__siwesEvidence = evidence;

export class DemoEvidenceRepository implements EvidenceRepository {
  async create(input: Omit<EvidenceRecord, "id" | "status">) {
    if (input.userId !== "demo-user") throw new AppError("FORBIDDEN", "Programme not found");
    const record = { ...input, id: crypto.randomUUID(), status: input.kind === "FILE" ? "PENDING" as const : "AVAILABLE" as const };
    evidence.push(record);
    return record;
  }
  async list(userId: string, programmeId: string) { return evidence.filter((record) => record.userId === userId && record.programmeId === programmeId); }
}
