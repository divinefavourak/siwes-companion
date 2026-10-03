-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('CISCO_LAB', 'PHYSICAL_LAB', 'PROGRAMMING', 'RESEARCH', 'OTHER');

-- CreateEnum
CREATE TYPE "TaskColumn" AS ENUM ('BACKLOG', 'IN_PROGRESS', 'BLOCKED', 'DONE');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "kind" "ProjectKind" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "ProjectTask" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "column" "TaskColumn" NOT NULL DEFAULT 'BACKLOG',
    "position" INTEGER NOT NULL DEFAULT 0,
    "checklist" JSONB NOT NULL DEFAULT '[]',
    "dueDate" DATE,
    "completedAt" TIMESTAMP(3),
    "lastLoggedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectTask_projectId_column_position_idx" ON "ProjectTask"("projectId", "column", "position");

-- AddForeignKey
ALTER TABLE "ProjectTask" ADD CONSTRAINT "ProjectTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
