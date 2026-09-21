import { PrismaEntryRepository, PrismaProgrammeRepository } from "@/src/adapters/web/prisma-repositories";
import { DemoEntryRepository, DemoProgrammeRepository } from "@/src/lib/demo-store";

const useDatabase = Boolean(process.env.DATABASE_URL);

export function getRepositories() {
  return useDatabase
    ? { programmes: new PrismaProgrammeRepository(), entries: new PrismaEntryRepository() }
    : { programmes: new DemoProgrammeRepository(), entries: new DemoEntryRepository() };
}
