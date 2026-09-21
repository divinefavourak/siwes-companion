import type { ProgrammeReportContext } from "@/src/core/reports/types";

export type PresentationDraft = {
  title: string;
  slides: Array<{ position: number; title: string; bullets: string[]; sourceEntryIds: string[]; unsupportedGaps: string[] }>;
};

export function buildPresentationDraft(context: ProgrammeReportContext): PresentationDraft {
  const sourceEntryIds = context.entries.map((entry) => entry.id);
  const activities = context.entries.map((entry) => entry.text);
  const skills = [...new Set(context.entries.flatMap((entry) => entry.skills))];
  const tools = [...new Set(context.entries.flatMap((entry) => entry.tools))];
  const projects = [...new Set(context.entries.flatMap((entry) => entry.projects))];
  return {
    title: `${context.organization} SIWES experience`,
    slides: [
      { position: 0, title: "SIWES experience", bullets: [context.organization, context.unit], sourceEntryIds, unsupportedGaps: [] },
      { position: 1, title: "Activities", bullets: activities.slice(0, 6), sourceEntryIds, unsupportedGaps: activities.length ? [] : ["Add reviewed activities."] },
      { position: 2, title: "Skills and tools", bullets: [...skills, ...tools], sourceEntryIds, unsupportedGaps: skills.length || tools.length ? [] : ["Confirm documented skills and tools."] },
      { position: 3, title: "Projects", bullets: projects, sourceEntryIds, unsupportedGaps: projects.length ? [] : ["Add documented projects or state that none were assigned."] },
      { position: 4, title: "Learning and conclusion", bullets: ["Explain what changed in your understanding, using your reviewed records."], sourceEntryIds, unsupportedGaps: ["Review this slide and add only supported learning."] }
    ]
  };
}
