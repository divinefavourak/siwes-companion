import type { EntryStructuredData, GeneratedEntry } from "@/src/core/entries/types";

const unsupportedObservationUpgrade = /\b(configured|optimized|deployed|implemented|managed|led|designed|fixed)\b/i;
const observationLanguage = /\b(watched|observed|shadowed|saw)\b/i;

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceContains(rawText: string, value: string): boolean {
  return normalized(rawText).includes(normalized(value));
}

export function findGroundingViolations(rawText: string, output: GeneratedEntry): string[] {
  const violations: string[] = [];
  if (observationLanguage.test(rawText) && unsupportedObservationUpgrade.test(output.formalEntry)) {
    violations.push("observation was upgraded to a performed responsibility");
  }

  for (const tool of output.structuredData.tools) {
    if (!sourceContains(rawText, tool)) violations.push(`unsupported tool: ${tool}`);
  }
  for (const project of output.structuredData.projects) {
    if (!sourceContains(rawText, project)) violations.push(`unsupported project: ${project}`);
  }
  for (const achievement of output.structuredData.achievements) {
    if (!sourceContains(rawText, achievement)) violations.push(`unsupported achievement: ${achievement}`);
  }

  return violations;
}

export function withClarification(
  output: GeneratedEntry,
  question: string
): GeneratedEntry {
  const questions = output.clarificationQuestions.includes(question)
    ? output.clarificationQuestions
    : [...output.clarificationQuestions, question].slice(0, 2);
  return { ...output, clarificationQuestions: questions };
}

export function emptyStructuredData(): EntryStructuredData {
  return {
    skills: [],
    tools: [],
    learnings: [],
    challenges: [],
    projects: [],
    achievements: [],
    claims: []
  };
}
