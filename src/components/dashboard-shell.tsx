"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  FileCheck,
  FileText,
  FolderArchive,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings2,
  Shield,
  ShieldCheck,
  Target,
  X
} from "lucide-react";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/src/components/notifications/notification-bell";

interface NavLinkItem {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
}

const links: NavLinkItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/today", label: "Today", icon: CalendarDays },
  { href: "/dashboard/history", label: "History", icon: FileText },
  { href: "/dashboard/skills", label: "Experience", icon: Target },
  { href: "/dashboard/evidence", label: "Evidence", icon: FolderArchive },
  { href: "/dashboard/report", label: "Report", icon: FileCheck },
  { href: "/dashboard/defense", label: "Defense", icon: ShieldCheck }
];

export function DashboardShell({
  children,
  studentName,
  isAdmin = false,
}: {
  children: React.ReactNode;
  studentName: string;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white px-5 py-6 lg:flex lg:flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        {/* Logo & Brand */}
        <Link href="/dashboard" className="flex items-center gap-3 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-sky-100 bg-white p-1 shadow-sm">
            <Image
              src="/r2rlogo.png"
              alt="SIWES Companion"
              width={40}
              height={40}
              className="size-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="block font-semibold tracking-tight text-slate-900 leading-tight">
              SIWES Companion
            </span>
            <span className="block text-[11px] font-medium text-slate-400">
              School Industrial Logbook
            </span>
          </div>
        </Link>

        {/* Navigation */}
        <div className="mt-10 px-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Workspace
          </p>
          <nav className="mt-3 space-y-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive =
                href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(href);

              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition min-h-[44px] ${
                    isActive
                      ? "text-brand font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActivePill"
                      className="absolute inset-0 rounded-xl bg-sky-50 border border-sky-100"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`relative size-4 shrink-0 transition-colors ${
                      isActive ? "text-brand" : "text-slate-400"
                    }`}
                  />
                  <span className="relative z-10">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div className="mt-6 pt-6 border-t border-slate-100 px-1">
            <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-500">
              Admin Access
            </p>
            <div className="mt-2">
              <Link
                href={"/admin/dashboard" as Route}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-700 bg-rose-50/80 border border-rose-200/80 hover:bg-rose-100 transition min-h-[44px]"
              >
                <Shield className="size-4 text-rose-600 shrink-0" />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          </div>
        )}

        {/* Bottom Integrity Notice (Clean & Anti-AI) */}
        <div className="mt-auto rounded-2xl border border-slate-200/80 bg-slate-900 p-4 text-white shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
            <CheckCircle2 className="size-3.5" /> Verified Grounding
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-300">
            All entries are strictly grounded in your raw notes for authentic supervisor review.
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="min-w-0 flex-1 flex flex-col">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-3.5 backdrop-blur-md lg:px-10 min-h-[64px]">
          {/* Mobile Brand */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
              className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            >
              <Menu className="size-5" />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-sky-100 bg-white p-0.5">
                <Image
                  src="/r2rlogo.png"
                  alt="R2R"
                  width={32}
                  height={32}
                  className="size-full object-contain"
                />
              </div>
              <span className="font-semibold tracking-tight text-slate-900 text-sm">
                SIWES Companion
              </span>
            </Link>
          </div>

          {/* User Details & Settings */}
          <div className="ml-auto flex items-center gap-3">
            {isAdmin && (
              <Link
                href={"/admin/dashboard" as Route}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition shadow-xs"
                title="Switch to Admin Dashboard"
              >
                <Shield className="size-3.5 text-rose-600" />
                <span className="hidden sm:inline">Admin Panel</span>
              </Link>
            )}

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {studentName}
              </span>
              <span className="text-[11px] text-slate-400">Student Record</span>
            </div>
            <NotificationBell />
            <Link
              href="/settings"
              aria-label="Settings"
              title="Settings"
              className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <Settings2 className="size-4" />
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/sign-in" })}
              aria-label="Sign Out"
              title="Sign Out"
              className="grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 flex lg:hidden">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="relative flex w-4/5 max-w-xs flex-col bg-white p-6 shadow-2xl"
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-8 overflow-hidden rounded-lg border border-sky-100 bg-white p-0.5">
                      <Image
                        src="/r2rlogo.png"
                        alt="R2R"
                        width={32}
                        height={32}
                        className="size-full object-contain"
                      />
                    </div>
                    <span className="font-semibold text-slate-900 text-sm">
                      SIWES Companion
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation"
                    className="grid size-11 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav className="mt-6 space-y-1.5 flex-1">
                  {links.map(({ href, label, icon: Icon }) => {
                    const isActive =
                      href === "/dashboard"
                        ? pathname === "/dashboard"
                        : pathname?.startsWith(href);

                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium min-h-[44px] transition ${
                          isActive
                            ? "bg-sky-50 text-brand font-semibold"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon
                          className={`size-4.5 ${
                            isActive ? "text-brand" : "text-slate-400"
                          }`}
                        />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  {isAdmin && (
                    <div className="pt-2">
                      <Link
                        href={"/admin/dashboard" as Route}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200/80 px-3 py-3 text-sm font-semibold text-rose-700 min-h-[44px]"
                      >
                        <Shield className="size-4 text-rose-600" />
                        <span>Admin Dashboard</span>
                      </Link>
                    </div>
                  )}
                </nav>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-slate-500 font-medium">Logged in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{studentName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/sign-in" })}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="size-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Page Content */}
        <main className="mx-auto max-w-[1280px] w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
