const statusMap: Record<string, { label: string; className: string }> = {
  // UserRole
  ADMIN:    { label: "Admin",    className: "bg-red-50 text-red-700 border-red-200" },
  STUDENT:  { label: "Student",  className: "bg-slate-50 text-slate-600 border-slate-200" },

  // ProgrammeStatus
  ACTIVE:      { label: "Active",      className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  COMPLETED:   { label: "Completed",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  ARCHIVED:    { label: "Archived",    className: "bg-slate-50 text-slate-400 border-slate-200" },

  // JobStatus
  QUEUED:    { label: "Queued",    className: "bg-amber-50 text-amber-700 border-amber-200" },
  RUNNING:   { label: "Running",   className: "bg-blue-50 text-blue-700 border-blue-200" },
  SUCCEEDED: { label: "Succeeded", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  FAILED:    { label: "Failed",    className: "bg-red-50 text-red-700 border-red-200" },
  CANCELLED: { label: "Cancelled", className: "bg-slate-50 text-slate-400 border-slate-200" },

  // EvidenceStatus
  PENDING:     { label: "Pending",     className: "bg-amber-50 text-amber-700 border-amber-200" },
  AVAILABLE:   { label: "Available",   className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  QUARANTINED: { label: "Quarantined", className: "bg-orange-50 text-orange-700 border-orange-200" },
  REJECTED:    { label: "Rejected",    className: "bg-red-50 text-red-700 border-red-200" },
  DELETED:     { label: "Deleted",     className: "bg-slate-50 text-slate-400 border-slate-200" },

  // EntryStatus
  DRAFT:            { label: "Draft",         className: "bg-slate-50 text-slate-500 border-slate-200" },
  READY_FOR_REVIEW: { label: "Ready",         className: "bg-amber-50 text-amber-700 border-amber-200" },
  SAVED:            { label: "Saved",         className: "bg-emerald-50 text-emerald-700 border-emerald-200" },

  // GenerationStatus
  NOT_REQUESTED:       { label: "Not Requested",  className: "bg-slate-50 text-slate-400 border-slate-200" },
  NEEDS_CLARIFICATION: { label: "Needs Clarif.",  className: "bg-orange-50 text-orange-700 border-orange-200" },

  // DefenseStatus
  ABANDONED: { label: "Abandoned", className: "bg-slate-50 text-slate-400 border-slate-200" },

  // SummaryStatus / ReportStatus / PresentationStatus
  GENERATED: { label: "Generated", className: "bg-sky-50 text-sky-700 border-sky-200" },
  EDITED:    { label: "Edited",    className: "bg-violet-50 text-violet-700 border-violet-200" },
  FINAL:     { label: "Final",     className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  EXPORTED:  { label: "Exported",  className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};

interface AdminBadgeProps {
  value: string;
  className?: string;
}

export function AdminBadge({ value, className = "" }: AdminBadgeProps) {
  const config = statusMap[value] ?? {
    label: value,
    className: "bg-slate-50 text-slate-600 border-slate-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}
