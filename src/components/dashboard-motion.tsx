"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight } from "lucide-react";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  }
};

export function DashboardMotionContainer({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {children}
    </motion.div>
  );
}

export function AnimatedProgressCard({
  organization,
  title,
  durationMonths,
  percent,
  completedDays,
  remainingDays
}: {
  organization: string;
  title: string;
  durationMonths: number;
  percent: number;
  completedDays: number;
  remainingDays: number;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className="relative overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 p-7 text-white shadow-soft"
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-400">
              {organization}
            </p>
            <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white">
              {title}
            </h2>
          </div>
          <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-sky-100">
            {durationMonths} Months
          </span>
        </div>

        <div className="mt-10 flex items-end justify-between">
          <div>
            <p className="text-5xl font-extrabold tracking-[-0.06em] text-white">
              {percent}%
            </p>
            <p className="mt-2 text-xs font-medium text-slate-300">
              {completedDays} verified working days documented
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-300">
              {remainingDays} working days remaining
            </p>
            <div className="mt-2.5 h-2 w-44 overflow-hidden rounded-full bg-white/15">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-300"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function AnimatedMotionItem({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}

export function MotionQuickCard({
  icon,
  title,
  body,
  href,
  action,
  locked
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  href?: Route;
  action?: string;
  locked?: boolean;
}) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="group flex flex-col justify-between rounded-[24px] border border-slate-200/80 bg-white p-6 shadow-sm transition-colors hover:border-sky-200"
    >
      <div>
        <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-brand transition-colors group-hover:bg-sky-100/70">
          {icon}
        </div>
        <h3 className="mt-5 text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
        <p className="mt-2 text-xs leading-5 text-slate-600">{body}</p>
      </div>
      {locked ? (
        <div className="mt-6 pt-3 border-t border-slate-100">
          <p className="text-[11px] font-medium text-slate-400">Available later in programme</p>
        </div>
      ) : (
        <div className="mt-6 pt-3 border-t border-slate-100">
          <Link
            href={href ?? "#"}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-brand transition-colors hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-lg"
          >
            <span>{action}</span>
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      )}
    </motion.div>
  );
}
