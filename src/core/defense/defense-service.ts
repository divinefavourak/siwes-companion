import type { ReviewedEntry } from "@/src/core/summaries/types";

export type DefenseFeedback = {
  questionsAnswered: string[];
  topicsCovered: string[];
  areasToReview: string[];
  questionsStruggledWith: string[];
};

export function nextGroundedQuestion(entries: ReviewedEntry[], asked: string[]): { question: string; sourceEntryIds: string[] } {
  const candidate = entries.find((entry) => !asked.includes(entry.id));
  if (!candidate) return { question: "What is one thing you learned during SIWES that you can explain with a specific example?", sourceEntryIds: [] };
  return { question: `Can you explain what you did on ${candidate.date}: ${candidate.text}?`, sourceEntryIds: [candidate.id] };
}

export function buildDefenseFeedback(input: {
  turns: Array<{ question: string; answer: string | null; topic: string; struggled: boolean }>;
}): DefenseFeedback {
  return {
    questionsAnswered: input.turns.filter((turn) => Boolean(turn.answer)).map((turn) => turn.question),
    topicsCovered: [...new Set(input.turns.map((turn) => turn.topic).filter(Boolean))],
    areasToReview: [...new Set(input.turns.filter((turn) => !turn.answer || turn.struggled).map((turn) => turn.topic).filter(Boolean))],
    questionsStruggledWith: input.turns.filter((turn) => turn.struggled).map((turn) => turn.question)
  };
}
