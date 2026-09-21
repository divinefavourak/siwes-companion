import { PrismaEvidenceRepository } from "@/src/adapters/web/prisma-evidence-repository";
import { DemoEvidenceRepository } from "@/src/lib/demo-evidence";

export function getEvidenceRepository() {
  return process.env.DATABASE_URL ? new PrismaEvidenceRepository() : new DemoEvidenceRepository();
}
