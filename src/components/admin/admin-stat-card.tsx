import { cn } from "@/src/lib/utils";

type Accent = "blue" | "green" | "red" | "orange" | "purple" | "slate";

const accentMap: Record<Accent, { bg: string; icon: string; value: string }> = {
  blue:   { bg: "bg-sky-50",    icon: "text-brand",      value: "text-slate-900" },
  green:  { bg: "bg-emerald-50", icon: "text-emerald-600", value: "text-slate-900" },
  red:    { bg: "bg-red-50",    icon: "text-red-600",     value: "text-slate-900" },
  orange: { bg: "bg-orange-50", icon: "text-orange-600",  value: "text-slate-900" },
  purple: { bg: "bg-purple-50", icon: "text-purple-600",  value: "text-slate-900" },
  slate:  { bg: "bg-slate-50",  icon: "text-slate-500",   value: "text-slate-900" },
};

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: Accent;
  description?: string;
}

export function AdminStatCard({
  title,
  value,
  icon,
  accent = "blue",
  description,
}: AdminStatCardProps) {
  const colors = accentMap[accent];

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <div className={cn("grid size-9 place-items-center rounded-xl", colors.bg)}>
          <span className={cn("size-4 [&>*]:size-4", colors.icon)}>{icon}</span>
        </div>
      </div>
      <p className={cn("text-3xl font-bold tracking-tight", colors.value)}>{value}</p>
      {description && (
        <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
