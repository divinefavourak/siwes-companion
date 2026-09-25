import type { EntryStructuredData, GeneratedEntry } from "@/src/core/entries/types";

const unsupportedObservationUpgrade = /\b(configured|optimized|deployed|implemented|managed|led|designed|fixed)\b/i;
const observationLanguage = /\b(watched|observed|shadowed|saw)\b/i;

function normalized(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function sourceContains(rawText: string, value: string): boolean {
  return normalized(rawText).includes(normalized(value));
}

function isParaphraseSupported(rawText: string, claim: string): boolean {
  const normRaw = normalized(rawText);
  const normClaim = normalized(claim);
  if (normRaw.includes(normClaim)) return true;
  
  // Token overlap check (ignoring short stop words)
  const claimTokens = normClaim.split(/\s+/).filter(w => w.length > 3);
  if (claimTokens.length === 0) return false;
  
  // If at least one significant word from the claim appears in the raw text, we tolerate it
  return claimTokens.some(token => normRaw.includes(token));
}

export function findGroundingViolations(rawText: string, output: GeneratedEntry): string[] {
  const violations: string[] = [];
  if (observationLanguage.test(rawText) && unsupportedObservationUpgrade.test(output.formalEntry)) {
    violations.push("observation was upgraded to a performed responsibility"); 
  }

  for (const tool of output.structuredData.tools) {
    if (!isParaphraseSupported(rawText, tool)) violations.push(`unsupported tool: ${tool}`);
  }
  for (const project of output.structuredData.projects) {
    if (!isParaphraseSupported(rawText, project)) violations.push(`unsupported project: ${project}`);
  }
  for (const achievement of output.structuredData.achievements) {
    if (!isParaphraseSupported(rawText, achievement)) violations.push(`unsupported achievement: ${achievement}`);
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
