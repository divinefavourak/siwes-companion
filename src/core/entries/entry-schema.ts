import { z } from "zod";

export const captureDailyNoteSchema = z.object({
  userId: z.string().min(1),
  programmeId: z.string().min(1),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rawText: z.string().trim().min(3).max(5000),
  source: z.enum(["WEB", "TELEGRAM", "VOICE", "IMPORT"])
});

export const generatedEntrySchema = z.object({
  formalEntry: z.string().trim().min(1).max(5000),
  structuredData: z.object({
    skills: z.array(z.string().trim().min(1)).max(20),
    tools: z.array(z.string().trim().min(1)).max(20),
    learnings: z.array(z.string().trim().min(1)).max(20),
    challenges: z.array(z.string().trim().min(1)).max(20),
    projects: z.array(z.string().trim().min(1)).max(20),
    achievements: z.array(z.string().trim().min(1)).max(20),
    claims: z.array(z.object({ text: z.string().trim().min(1), source: z.enum(["raw", "derived"]) })).max(50)
  }),
  clarificationQuestions: z.array(z.string().trim().min(1)).max(3)
});
