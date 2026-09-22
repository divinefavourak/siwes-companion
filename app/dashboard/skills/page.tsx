import { Target, CheckCircle2, Tag, Wrench, FolderGit2 } from "lucide-react";

export default function SkillsPage() {
  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
          <Target className="size-3.5" /> Technical Competence Matrix
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Skills, Tools & Projects
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 max-w-xl">
          Derived strictly from your daily logbook entries. As you log technical activities, your verified competencies are automatically mapped here for your final report.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-brand">
            <Tag className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Applied Skills</h3>
          <p className="mt-1 text-xs text-slate-500">
            Network troubleshooting, hardware configuration, frontend development, etc.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-brand">
            <Wrench className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Tools & Technologies</h3>
          <p className="mt-1 text-xs text-slate-500">
            Cisco Packet Tracer, Docker, PostgreSQL, React, Linux CLI, etc.
          </p>
        </div>

        <div className="rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-brand">
            <FolderGit2 className="size-5" />
          </div>
          <h3 className="mt-4 text-base font-bold text-slate-900">Technical Projects</h3>
          <p className="mt-1 text-xs text-slate-500">
            Milestones and sub-projects completed during placement.
          </p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/80 bg-white p-8 text-center shadow-soft">
        <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-6" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-900">Continuous Logbook Synthesis</h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          Log your daily work routinely. The platform continuously extracts and categorizes real skills practiced so you never have to invent or guess when presenting to examiners.
        </p>
      </div>
    </div>
  );
}
