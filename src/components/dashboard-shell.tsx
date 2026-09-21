import Link from "next/link";
import type { Route } from "next";
import { CalendarDays, FileText, LayoutDashboard, Settings2, Sparkles, Target } from "lucide-react";

const links: Array<{ href: Route; label: string; icon: typeof LayoutDashboard }> = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/today", label: "Today", icon: CalendarDays },
  { href: "/dashboard/history", label: "History", icon: FileText },
  { href: "/dashboard/skills", label: "Experience", icon: Target }
];

export function DashboardShell({ children, studentName }: { children: React.ReactNode; studentName: string }) {
  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/70 px-5 py-6 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex items-center gap-3 px-2"><span className="grid size-10 place-items-center rounded-2xl bg-brand text-lg font-black text-white shadow-lg shadow-indigo-200">S</span><span className="font-semibold tracking-tight">SIWES Companion</span></Link>
        <div className="mt-12 px-2"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Workspace</p><nav className="mt-4 space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-500 transition hover:bg-indigo-50 hover:text-brand"><Icon className="size-4" />{label}</Link>)}</nav></div>
        <div className="mt-auto rounded-2xl bg-slate-950 p-4 text-white"><div className="flex items-center gap-2 text-xs font-semibold text-indigo-200"><Sparkles className="size-4" />Document with confidence</div><p className="mt-3 text-sm leading-6 text-slate-300">Your note stays the source. AI helps you make it clear.</p></div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-slate-200/80 bg-white/75 px-5 py-4 backdrop-blur lg:px-10"><Link href="/dashboard" className="flex items-center gap-3 lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-brand text-sm font-black text-white">S</span><span className="font-semibold">SIWES Companion</span></Link><div className="ml-auto flex items-center gap-3"><span className="hidden text-sm text-slate-500 sm:block">{studentName}</span><Link href="/settings" aria-label="Settings" className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-brand hover:text-brand"><Settings2 className="size-4" /></Link></div></header>
        <main className="mx-auto max-w-[1280px] px-5 py-8 lg:px-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
