import { prisma } from "@/src/lib/prisma";
import type { EvidenceInput, EvidenceRecord, EvidenceRepository } from "@/src/core/evidence/evidence-service";
import { AppError } from "@/src/core/shared/errors";

export class PrismaEvidenceRepository implements EvidenceRepository {
  async create(input: EvidenceInput): Promise<EvidenceRecord> {
    const programme = await prisma.siwesProgramme.findFirst({ where: { id: input.programmeId, userId: input.userId }, select: { id: true } });
    if (!programme) throw new AppError("FORBIDDEN", "Programme not found");
    const row = await prisma.evidence.create({ data: { programmeId: input.programmeId, entryId: input.entryId, projectId: input.projectId, kind: input.kind, title: input.title, note: input.note, url: input.url, fileName: input.fileName, mimeType: input.mimeType, byteSize: input.byteSize, status: input.kind === "FILE" ? "PENDING" : "AVAILABLE" } });
    return { ...input, id: row.id, status: row.status };
  }

  async list(userId: string, programmeId: string) {
    const rows = await prisma.evidence.findMany({ where: { programmeId, programme: { userId }, status: { not: "DELETED" } }, orderBy: { createdAt: "desc" } });
    return rows.map((row) => ({ userId, programmeId, entryId: row.entryId ?? undefined, projectId: row.projectId ?? undefined, kind: row.kind, title: row.title, note: row.note ?? undefined, url: row.url ?? undefined, fileName: row.fileName ?? undefined, mimeType: row.mimeType ?? undefined, byteSize: row.byteSize ?? undefined, id: row.id, status: row.status }));
  }
}
