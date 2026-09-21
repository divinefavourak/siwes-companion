import { z } from "zod";
import { AppError } from "@/src/core/shared/errors";

export const evidenceSchema = z.object({
  userId: z.string().min(1),
  programmeId: z.string().min(1),
  entryId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  kind: z.enum(["FILE", "URL", "NOTE"]),
  title: z.string().trim().min(1).max(160),
  note: z.string().trim().max(2000).optional(),
  url: z.string().url().max(2000).optional(),
  fileName: z.string().trim().max(255).optional(),
  mimeType: z.string().trim().max(120).optional(),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024).optional()
});

export type EvidenceInput = z.infer<typeof evidenceSchema>;
export type EvidenceRecord = EvidenceInput & { id: string; status: "PENDING" | "AVAILABLE" | "QUARANTINED" | "REJECTED" | "DELETED" };

export interface EvidenceRepository {
  create(input: EvidenceInput): Promise<EvidenceRecord>;
  list(userId: string, programmeId: string): Promise<EvidenceRecord[]>;
}

export async function createEvidence(repository: EvidenceRepository, input: EvidenceInput): Promise<EvidenceRecord> {
  const parsed = evidenceSchema.safeParse(input);
  if (!parsed.success) throw new AppError("VALIDATION_ERROR", "Evidence details are invalid", { issues: parsed.error.issues });
  if (parsed.data.kind === "URL" && !parsed.data.url) throw new AppError("VALIDATION_ERROR", "A URL is required for link evidence");
  if (parsed.data.kind === "NOTE" && !parsed.data.note) throw new AppError("VALIDATION_ERROR", "A note is required for note evidence");
  if (parsed.data.kind === "FILE" && (!parsed.data.fileName || !parsed.data.mimeType || !parsed.data.byteSize)) throw new AppError("VALIDATION_ERROR", "File metadata is required before upload");
  return repository.create(parsed.data);
}
