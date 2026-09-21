-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProgrammeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SupervisorType" AS ENUM ('INDUSTRY', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "WorkingDayStatus" AS ENUM ('WORKING', 'NON_WORKING');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('DRAFT', 'READY_FOR_REVIEW', 'SAVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RawSource" AS ENUM ('WEB', 'TELEGRAM', 'VOICE', 'IMPORT');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'COMPLETED', 'NEEDS_CLARIFICATION', 'FAILED');

-- CreateEnum
CREATE TYPE "EvidenceKind" AS ENUM ('FILE', 'URL', 'NOTE');

-- CreateEnum
CREATE TYPE "EvidenceStatus" AS ENUM ('PENDING', 'AVAILABLE', 'QUARANTINED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('DRAFT', 'GENERATED', 'EDITED', 'FINAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'EDITED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "PresentationStatus" AS ENUM ('DRAFT', 'GENERATED', 'EDITED', 'EXPORTED');

-- CreateEnum
CREATE TYPE "DefenseStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('GENERATE_ENTRY', 'GENERATE_WEEKLY_SUMMARY', 'GENERATE_MONTHLY_SUMMARY', 'GENERATE_REPORT', 'GENERATE_PRESENTATION', 'SEND_REMINDER', 'DELETE_USER_DATA');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "SiwesProgramme" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "durationMonths" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "matricNumber" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Africa/Lagos',
    "workingWeekdays" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "status" "ProgrammeStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiwesProgramme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supervisor" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "type" "SupervisorType" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supervisor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkingDayOverride" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "WorkingDayStatus" NOT NULL,
    "note" TEXT,

    CONSTRAINT "WorkingDayOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "workDate" DATE NOT NULL,
    "status" "EntryStatus" NOT NULL DEFAULT 'DRAFT',
    "rawText" TEXT NOT NULL,
    "rawSource" "RawSource" NOT NULL DEFAULT 'WEB',
    "generatedText" TEXT,
    "editedText" TEXT,
    "structuredData" JSONB,
    "generationStatus" "GenerationStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "generationError" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastEditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrySkill" (
    "entryId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    CONSTRAINT "EntrySkill_pkey" PRIMARY KEY ("entryId","skillId")
);

-- CreateTable
CREATE TABLE "Tool" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "firstSeenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryTool" (
    "entryId" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,

    CONSTRAINT "EntryTool_pkey" PRIMARY KEY ("entryId","toolId")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntryProject" (
    "entryId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "EntryProject_pkey" PRIMARY KEY ("entryId","projectId")
);

-- CreateTable
CREATE TABLE "Evidence" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "entryId" TEXT,
    "projectId" TEXT,
    "kind" "EvidenceKind" NOT NULL,
    "status" "EvidenceStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "note" TEXT,
    "fileKey" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "byteSize" INTEGER,
    "url" TEXT,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklySummary" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedText" TEXT,
    "editedText" TEXT,
    "sourceEntryIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySummary" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "monthNumber" INTEGER NOT NULL,
    "monthStartDate" DATE NOT NULL,
    "monthEndDate" DATE NOT NULL,
    "status" "SummaryStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedText" TEXT,
    "editedText" TEXT,
    "sourceEntryIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlySummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSection" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "generatedText" TEXT,
    "editedText" TEXT,
    "sourceEntryIds" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presentation" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "status" "PresentationStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Presentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PresentationSlide" (
    "id" TEXT NOT NULL,
    "presentationId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "bullets" JSONB NOT NULL,
    "speakerNotes" TEXT,
    "keyPoint" TEXT,
    "sourceEntryIds" JSONB NOT NULL,

    CONSTRAINT "PresentationSlide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefenseSession" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT NOT NULL,
    "status" "DefenseStatus" NOT NULL DEFAULT 'ACTIVE',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "DefenseSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DefenseTurn" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "followUp" TEXT,
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DefenseTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramIdentity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramLinkToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "telegramUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BotConversationState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BotConversationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramUpdate" (
    "id" TEXT NOT NULL,
    "updateId" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "programmeId" TEXT,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "lastError" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programmeId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LlmUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "programmeId" TEXT,
    "entryId" TEXT,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCost" DECIMAL(12,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LlmUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "SiwesProgramme_userId_status_idx" ON "SiwesProgramme"("userId", "status");

-- CreateIndex
CREATE INDEX "SiwesProgramme_startDate_endDate_idx" ON "SiwesProgramme"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "Supervisor_programmeId_type_idx" ON "Supervisor"("programmeId", "type");

-- CreateIndex
CREATE INDEX "WorkingDayOverride_programmeId_date_status_idx" ON "WorkingDayOverride"("programmeId", "date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingDayOverride_programmeId_date_key" ON "WorkingDayOverride"("programmeId", "date");

-- CreateIndex
CREATE INDEX "Entry_programmeId_workDate_idx" ON "Entry"("programmeId", "workDate");

-- CreateIndex
CREATE INDEX "Entry_programmeId_status_idx" ON "Entry"("programmeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_programmeId_workDate_key" ON "Entry"("programmeId", "workDate");

-- CreateIndex
CREATE INDEX "Skill_programmeId_name_idx" ON "Skill"("programmeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_programmeId_name_key" ON "Skill"("programmeId", "name");

-- CreateIndex
CREATE INDEX "Tool_programmeId_name_idx" ON "Tool"("programmeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Tool_programmeId_name_key" ON "Tool"("programmeId", "name");

-- CreateIndex
CREATE INDEX "Project_programmeId_name_idx" ON "Project"("programmeId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Project_programmeId_name_key" ON "Project"("programmeId", "name");

-- CreateIndex
CREATE INDEX "Evidence_programmeId_createdAt_idx" ON "Evidence"("programmeId", "createdAt");

-- CreateIndex
CREATE INDEX "Evidence_entryId_idx" ON "Evidence"("entryId");

-- CreateIndex
CREATE INDEX "Evidence_projectId_idx" ON "Evidence"("projectId");

-- CreateIndex
CREATE INDEX "WeeklySummary_programmeId_weekStartDate_idx" ON "WeeklySummary"("programmeId", "weekStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklySummary_programmeId_weekStartDate_key" ON "WeeklySummary"("programmeId", "weekStartDate");

-- CreateIndex
CREATE INDEX "MonthlySummary_programmeId_monthStartDate_idx" ON "MonthlySummary"("programmeId", "monthStartDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySummary_programmeId_monthNumber_key" ON "MonthlySummary"("programmeId", "monthNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Report_programmeId_key" ON "Report"("programmeId");

-- CreateIndex
CREATE INDEX "ReportSection_reportId_position_idx" ON "ReportSection"("reportId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSection_reportId_sectionKey_key" ON "ReportSection"("reportId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReportSection_reportId_position_key" ON "ReportSection"("reportId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "Presentation_programmeId_key" ON "Presentation"("programmeId");

-- CreateIndex
CREATE INDEX "PresentationSlide_presentationId_position_idx" ON "PresentationSlide"("presentationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "PresentationSlide_presentationId_position_key" ON "PresentationSlide"("presentationId", "position");

-- CreateIndex
CREATE INDEX "DefenseSession_programmeId_startedAt_idx" ON "DefenseSession"("programmeId", "startedAt");

-- CreateIndex
CREATE INDEX "DefenseTurn_sessionId_position_idx" ON "DefenseTurn"("sessionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DefenseTurn_sessionId_position_key" ON "DefenseTurn"("sessionId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramIdentity_userId_key" ON "TelegramIdentity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramIdentity_telegramUserId_key" ON "TelegramIdentity"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkToken_tokenHash_key" ON "TelegramLinkToken"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramLinkToken_userId_expiresAt_idx" ON "TelegramLinkToken"("userId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BotConversationState_userId_key" ON "BotConversationState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BotConversationState_telegramChatId_key" ON "BotConversationState"("telegramChatId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramUpdate_updateId_key" ON "TelegramUpdate"("updateId");

-- CreateIndex
CREATE INDEX "Job_status_runAfter_idx" ON "Job"("status", "runAfter");

-- CreateIndex
CREATE INDEX "Job_programmeId_type_idx" ON "Job"("programmeId", "type");

-- CreateIndex
CREATE INDEX "AuditEvent_userId_createdAt_idx" ON "AuditEvent"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditEvent_programmeId_entityType_entityId_idx" ON "AuditEvent"("programmeId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "LlmUsage_userId_createdAt_idx" ON "LlmUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "LlmUsage_programmeId_purpose_idx" ON "LlmUsage"("programmeId", "purpose");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiwesProgramme" ADD CONSTRAINT "SiwesProgramme_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supervisor" ADD CONSTRAINT "Supervisor_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkingDayOverride" ADD CONSTRAINT "WorkingDayOverride_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySkill" ADD CONSTRAINT "EntrySkill_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySkill" ADD CONSTRAINT "EntrySkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tool" ADD CONSTRAINT "Tool_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTool" ADD CONSTRAINT "EntryTool_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryTool" ADD CONSTRAINT "EntryTool_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Tool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryProject" ADD CONSTRAINT "EntryProject_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntryProject" ADD CONSTRAINT "EntryProject_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidence" ADD CONSTRAINT "Evidence_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklySummary" ADD CONSTRAINT "WeeklySummary_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySummary" ADD CONSTRAINT "MonthlySummary_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSection" ADD CONSTRAINT "ReportSection_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presentation" ADD CONSTRAINT "Presentation_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PresentationSlide" ADD CONSTRAINT "PresentationSlide_presentationId_fkey" FOREIGN KEY ("presentationId") REFERENCES "Presentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseSession" ADD CONSTRAINT "DefenseSession_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DefenseTurn" ADD CONSTRAINT "DefenseTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DefenseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramIdentity" ADD CONSTRAINT "TelegramIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramLinkToken" ADD CONSTRAINT "TelegramLinkToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BotConversationState" ADD CONSTRAINT "BotConversationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_programmeId_fkey" FOREIGN KEY ("programmeId") REFERENCES "SiwesProgramme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LlmUsage" ADD CONSTRAINT "LlmUsage_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
