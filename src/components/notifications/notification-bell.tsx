"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Info,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "REMINDER" | "ALERT" | "ACTION_REQUIRED" | "SUCCESS";
  link: string | null;
  read: boolean;
  createdAt: string;
}

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getTypeIcon(type: NotificationItem["type"]) {
  switch (type) {
    case "REMINDER":
      return <Clock className="size-4 text-amber-500" />;
    case "ALERT":
    case "ACTION_REQUIRED":
      return <AlertTriangle className="size-4 text-rose-500" />;
    case "SUCCESS":
      return <CheckCircle2 className="size-4 text-emerald-500" />;
    case "INFO":
    default:
      return <Sparkles className="size-4 text-sky-500" />;
  }
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignore background fetch error
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleMarkAllRead() {
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/mark-all-read", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }

  async function handleNotificationClick(item: NotificationItem) {
    if (!item.read) {
      fetch(`/api/notifications/${item.id}/read`, { method: "PATCH" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (item.link) {
      router.push(item.link as Route);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((prev) => !prev);
          if (!open) fetchNotifications();
        }}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={open}
        className="relative grid size-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-brand hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Bell className="size-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">Notifications</span>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-brand">
                    {unreadCount} new
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={loading}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline disabled:opacity-50"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="mx-auto grid size-10 place-items-center rounded-full bg-slate-100 text-slate-400 mb-2.5">
                    <Info className="size-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">All caught up!</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">No notifications at the moment.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleNotificationClick(item)}
                    className={`flex items-start gap-3 p-3.5 transition cursor-pointer hover:bg-slate-50/90 ${
                      item.read ? "opacity-75" : "bg-sky-50/20"
                    }`}
                  >
                    <div className="mt-0.5 shrink-0 rounded-lg border border-slate-100 bg-white p-1.5 shadow-2xs">
                      {getTypeIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs ${item.read ? "font-medium text-slate-700" : "font-bold text-ink"}`}>
                          {item.title}
                        </p>
                        <span className="shrink-0 text-[10px] text-slate-400">
                          {timeAgo(item.createdAt)}
                        </span>
                      </div>

                      <p className="mt-0.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>

                      {item.link && (
                        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-brand">
                          <span>View Details</span>
                          <ChevronRight className="size-3" />
                        </div>
                      )}
                    </div>

                    {!item.read && (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
