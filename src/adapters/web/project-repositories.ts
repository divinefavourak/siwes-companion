import { PrismaProjectRepository } from "@/src/adapters/web/prisma-project-repository";
import { DemoProjectRepository } from "@/src/lib/demo-projects";

export function getProjectRepository() {
  return process.env.DATABASE_URL ? new PrismaProjectRepository() : new DemoProjectRepository();
}
