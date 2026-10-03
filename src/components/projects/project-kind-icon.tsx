import { Cable, CodeXml, FlaskConical, FolderKanban, Network } from "lucide-react";
import type { ProjectKind } from "@/src/core/projects/types";

const ICONS = {
  CISCO_LAB: Network,
  PHYSICAL_LAB: Cable,
  PROGRAMMING: CodeXml,
  RESEARCH: FlaskConical,
  OTHER: FolderKanban
} satisfies Record<ProjectKind, typeof Network>;

export function ProjectKindIcon({ kind, className }: { kind: ProjectKind; className?: string }) {
  const Icon = ICONS[kind];
  return <Icon className={className} aria-hidden />;
}
