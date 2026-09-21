import type { ProgrammeReportContext, ReportDraft, ReportSectionDraft } from "@/src/core/reports/types";

export const defaultReportSections = [
  ["introduction", "Introduction"],
  ["organization-overview", "Organization overview"],
  ["department-unit", "Department or unit"],
  ["activities-carried-out", "Activities carried out"],
  ["skills-acquired", "Skills acquired"],
  ["tools-technologies", "Tools and technologies"],
  ["projects", "Projects"],
  ["challenges-solutions", "Challenges and solutions"],
  ["knowledge-gained", "Knowledge gained"],
  ["conclusion", "Conclusion"],
  ["recommendations", "Recommendations"]
] as const;

function list(values: string[]): string {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "";
}

function sources(entries: ProgrammeReportContext["entries"]): string[] {
  return entries.map((entry) => entry.id);
}

export function buildReportDraft(context: ProgrammeReportContext): ReportDraft {
  const entryIds = sources(context.entries);
  const activities = context.entries.map((entry) => entry.text);
  const skills = [...new Set(context.entries.flatMap((entry) => entry.skills))];
  const tools = [...new Set(context.entries.flatMap((entry) => entry.tools))];
  const projects = [...new Set(context.entries.flatMap((entry) => entry.projects))];
  const challenges = [...new Set(context.entries.flatMap((entry) => entry.challenges))];
  const content: Record<string, { text: string; gaps: string[] }> = {
    introduction: { text: `SIWES placement at ${context.organization} in ${context.unit} from ${context.startDate} to ${context.endDate}.`, gaps: [] },
    "organization-overview": { text: context.organization, gaps: ["Add a student-reviewed description of the organization."] },
    "department-unit": { text: context.unit, gaps: [] },
    "activities-carried-out": { text: list(activities), gaps: activities.length ? [] : ["Add reviewed daily activities."] },
    "skills-acquired": { text: list(skills), gaps: skills.length ? [] : ["Confirm the skills you want to include."] },
    "tools-technologies": { text: list(tools), gaps: tools.length ? [] : ["Confirm tools named in your entries."] },
    projects: { text: list(projects), gaps: projects.length ? [] : ["Add documented projects or state that none were assigned."] },
    "challenges-solutions": { text: list(challenges), gaps: challenges.length ? [] : ["Add documented challenges and any solutions you actually used."] },
    "knowledge-gained": { text: list(skills), gaps: skills.length ? [] : ["Add what you learned from reviewed entries."] },
    conclusion: { text: activities.length ? "Review this conclusion and adapt it to your experience." : "", gaps: ["Add a student-written conclusion."] },
    recommendations: { text: "", gaps: ["Add recommendations based on your experience."] }
  };
  const sections: ReportSectionDraft[] = defaultReportSections.map(([sectionKey, title], position) => ({
    sectionKey,
    title,
    position,
    generatedText: content[sectionKey].text,
    sourceEntryIds: entryIds,
    unsupportedGaps: content[sectionKey].gaps
  }));
  return { sections };
}
