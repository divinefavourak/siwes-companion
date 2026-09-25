"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Route } from "next";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Cpu,
  FolderSearch,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  Users,
  X,
} from "lucide-react";
import { signOut } from "next-auth/react";

interface NavLinkItem {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
}

const links: NavLinkItem[] = [
  { href: "/admin/dashboard" as Route, label: "Overview", icon: LayoutDashboard },
  { href: "/admin/users" as Route, label: "Users", icon: Users },
  { href: "/admin/programmes" as Route, label: "Programmes", icon: BookOpen },
  { href: "/admin/evidence" as Route, label: "Evidence", icon: FolderSearch },
  { href: "/admin/jobs" as Route, label: "Jobs", icon: Cpu },
  { href: "/admin/audit" as Route, label: "Audit Log", icon: ClipboardList },
  { href: "/admin/llm-usage" as Route, label: "LLM Usage", icon: BarChart3 },
  { href: "/admin/telegram" as Route, label: "Telegram", icon: MessageCircle },
];

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-paper text-ink lg:flex">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white px-5 py-6 lg:flex lg:flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        {/* Logo & Brand */}
        <Link
          href={"/admin/dashboard" as Route}
          className="flex items-center gap-3 px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-xl"
        >
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
            <span className="inline-flex items-center gap-1 mt-0.5 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-600">
              <Shield className="size-2.5" /> Admin
            </span>
          </div>
        </Link>

        <div className="mt-4 px-2">
          <Link
            href={"/dashboard" as Route}
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-brand transition"
          >
            <LayoutDashboard className="size-3.5 text-slate-500" />
            <span>Switch to Student View</span>
          </Link>
        </div>

        {/* Navigation */}
        <div className="mt-10 px-1">
          <p className="px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
            Control Panel
          </p>
          <nav className="mt-3 space-y-1">
            {links.map(({ href, label, icon: Icon }) => {
              const isActive = pathname?.startsWith(href);
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
                      layoutId="adminSidebarActivePill"
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

        {/* Bottom — back to app + sign out */}
        <div className="mt-auto space-y-2">
          <Link
            href={"/dashboard" as Route}
            className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition min-h-[44px]"
          >
            <LogOut className="size-4 rotate-180 text-slate-400" />
            Back to App
          </Link>
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
            className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition min-h-[44px]"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
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
            <span className="font-semibold tracking-tight text-slate-900 text-sm">
              Admin Panel
            </span>
          </div>

          {/* Desktop page title placeholder — filled by each page via its own heading */}
          <div className="hidden lg:block" />

          {/* Admin user chip & Student View switcher */}
          <div className="ml-auto flex items-center gap-3">
            <Link
              href={"/dashboard" as Route}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand transition shadow-xs"
              title="Switch to Student Studio"
            >
              <LayoutDashboard className="size-3.5 text-slate-500" />
              <span className="hidden sm:inline">Student View</span>
            </Link>

            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-semibold text-slate-900 leading-tight">
                {adminName}
              </span>
              <span className="text-[11px] text-red-500 font-semibold">Admin</span>
            </div>
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
                  <span className="font-semibold text-slate-900 text-sm flex items-center gap-2">
                    <Shield className="size-4 text-red-500" /> Admin Panel
                  </span>
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
                    const isActive = pathname?.startsWith(href);
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
                          className={`size-4.5 ${isActive ? "text-brand" : "text-slate-400"}`}
                        />
                        <span>{label}</span>
                      </Link>
                    );
                  })}

                  <div className="pt-2">
                    <Link
                      href={"/dashboard" as Route}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-3 text-sm font-semibold text-slate-700 min-h-[44px]"
                    >
                      <LayoutDashboard className="size-4 text-slate-500" />
                      <span>Switch to Student View</span>
                    </Link>
                  </div>
                </nav>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-slate-500 font-medium">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{adminName}</p>
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
        <main className="mx-auto max-w-[1400px] w-full px-4 py-6 sm:px-6 lg:px-10 lg:py-10 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
