"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, ExternalLink, RefreshCw, Send, ShieldCheck, Unlink } from "lucide-react";
import type { Programme } from "@/src/core/siwes/types";

const WEEKDAYS = [
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
  { day: 0, label: "Sunday", short: "Sun" }
];

type TelegramIdentity = {
  telegramUserId: string;
  username?: string;
  firstName?: string;
  linkedAt: string;
};

export default function SettingsPage() {
  const [programme, setProgramme] = useState<Programme | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const [workingWeekdays, setWorkingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timezone, setTimezone] = useState("Africa/Lagos");

  // Telegram state
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramIdentity, setTelegramIdentity] = useState<TelegramIdentity | null>(null);
  const [botUsername, setBotUsername] = useState("siwes_companion_bot");
  const [generatingToken, setGeneratingToken] = useState(false);
  const [linkData, setLinkData] = useState<{ deepLink: string; rawToken: string; expiresAt: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [telegramStatusLoading, setTelegramStatusLoading] = useState(true);

  useEffect(() => {
    fetchProgramme();
    fetchTelegramStatus();
  }, []);

  async function fetchProgramme() {
    try {
      const response = await fetch("/api/settings/programme");
      if (response.ok) {
        const data = await response.json();
        if (data.programme) {
          setProgramme(data.programme);
          setWorkingWeekdays(data.programme.workingWeekdays ?? [1, 2, 3, 4, 5]);
          setTimezone(data.programme.timezone ?? "Africa/Lagos");
        }
      }
    } catch {
      // Ignored in offline demo
    } finally {
      setLoading(false);
    }
  }

  async function fetchTelegramStatus() {
    try {
      const response = await fetch("/api/telegram/status");
      if (response.ok) {
        const data = await response.json();
        setTelegramLinked(Boolean(data.linked));
        setTelegramIdentity(data.identity ?? null);
        if (data.botUsername) setBotUsername(data.botUsername);
      }
    } catch {
      // Ignored in offline demo
    } finally {
      setTelegramStatusLoading(false);
    }
  }

  async function saveCalendarSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const response = await fetch("/api/settings/programme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workingWeekdays, timezone })
      });
      if (response.ok) {
        const data = await response.json();
        setProgramme(data.programme);
        setSettingsMessage("Calendar settings saved successfully.");
      } else {
        setSettingsMessage("Failed to save settings. Please try again.");
      }
    } catch {
      setSettingsMessage("Could not connect to save settings.");
    } finally {
      setSavingSettings(false);
    }
  }

  function toggleWeekday(day: number) {
    if (workingWeekdays.includes(day)) {
      if (workingWeekdays.length === 1) return; // Keep at least one
      setWorkingWeekdays(workingWeekdays.filter((d) => d !== day));
    } else {
      setWorkingWeekdays([...workingWeekdays, day].sort());
    }
  }

  async function generateTelegramLink() {
    setGeneratingToken(true);
    try {
      const response = await fetch("/api/telegram/link-token", { method: "POST" });
      if (response.ok) {
        const data = await response.json();
        setLinkData(data);
      }
    } catch {
      // Handle error
    } finally {
      setGeneratingToken(false);
    }
  }

  async function unlinkTelegram() {
    if (!confirm("Are you sure you want to disconnect Telegram?")) return;
    try {
      const response = await fetch("/api/telegram/unlink", { method: "POST" });
      if (response.ok) {
        setTelegramLinked(false);
        setTelegramIdentity(null);
        setLinkData(null);
      }
    } catch {
      // Handle error
    }
  }

  function copyCode() {
    if (!linkData?.rawToken) return;
    navigator.clipboard.writeText(linkData.rawToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <main className="shell-gradient min-h-screen px-5 py-10">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:underline">
            <ArrowLeft className="size-4" /> Back to dashboard
          </Link>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Configuration</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Settings & Integrations</h1>
            </div>
          </div>
          <p className="mt-2 text-sm leading-6 text-muted">
            Manage your working-day calendar, placement details, and connected channels.
          </p>
        </div>

        {/* Programme Placement Overview */}
        {loading ? (
          <div className="h-44 animate-pulse rounded-[28px] bg-slate-200" />
        ) : programme ? (
          <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">SIWES Placement</h2>
                <p className="text-xs text-muted">Configured at programme creation</p>
              </div>
              <span className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                {programme.durationMonths} Months ({programme.status})
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-xs font-medium text-slate-400">Institution</span>
                <p className="font-semibold text-slate-800">{programme.institution}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Department</span>
                <p className="font-semibold text-slate-800">{programme.department} ({programme.level} Level)</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Matric / Reg Number</span>
                <p className="font-semibold text-slate-800">{programme.matricNumber}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Placement Organization</span>
                <p className="font-semibold text-slate-800">{programme.organization} &bull; {programme.unit}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">Start Date</span>
                <p className="font-semibold text-slate-800">{programme.startDate}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-slate-400">End Date</span>
                <p className="font-semibold text-slate-800">{programme.endDate}</p>
              </div>
            </div>
          </section>
        ) : null}

        {/* Working Days & Calendar Settings */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-ink">Working-Day Calendar</h2>
            <p className="mt-1 text-xs text-muted">
              Configure which days count as working days in your logbook and streak calculations.
            </p>
          </div>

          <form onSubmit={saveCalendarSettings} className="mt-6 space-y-6">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Working Weekdays</label>
              <p className="text-xs text-slate-400 mb-3">Select every day your placement expects you to be on-site.</p>
              
              <div className="flex flex-wrap gap-2">
                {WEEKDAYS.map(({ day, label, short }) => {
                  const isSelected = workingWeekdays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className={`flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition ${
                        isSelected
                          ? "border-brand bg-sky-50 text-brand shadow-sm"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <span className={`grid size-4 place-items-center rounded-full text-[10px] ${isSelected ? "bg-brand text-white" : "border border-slate-300"}`}>
                        {isSelected ? "✓" : ""}
                      </span>
                      <span className="hidden sm:inline">{label}</span>
                      <span className="sm:hidden">{short}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setWorkingWeekdays([1, 2, 3, 4, 5])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  Reset: Mon–Fri
                </button>
                <button
                  type="button"
                  onClick={() => setWorkingWeekdays([1, 2, 3, 4, 5, 6])}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 hover:border-slate-300"
                >
                  Preset: Mon–Sat
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="timezone-select" className="text-xs font-semibold uppercase tracking-wider text-slate-500">Timezone</label>
              <p className="text-xs text-slate-400 mb-2">Used to calculate &ldquo;today&rdquo; for your daily logging cutoffs.</p>
              <select
                id="timezone-select"
                aria-label="Timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full sm:w-72 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-brand focus:bg-white"
              >
                <option value="Africa/Lagos">Africa/Lagos (WAT, UTC+1)</option>
                <option value="UTC">UTC (Universal Time)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-50"
              >
                {savingSettings ? "Saving..." : "Save Calendar Settings"}
              </button>
              {settingsMessage && (
                <span className="text-xs font-medium text-emerald-600 animate-fade-in">{settingsMessage}</span>
              )}
            </div>
          </form>
        </section>

        {/* Telegram Integration Wizard */}
        <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-soft">
          <div className="flex items-start justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-sky-500">
                <Send className="size-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-ink">Telegram Companion Bot</h2>
                <p className="text-xs text-muted">Log from chat or web with real-time sync</p>
              </div>
            </div>

            {!telegramStatusLoading && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                telegramLinked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>
                {telegramLinked ? (
                  <>
                    <Check className="size-3.5" /> Linked
                  </>
                ) : (
                  "Not Connected"
                )}
              </span>
            )}
          </div>

          {telegramLinked ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-ink">Connected Telegram Account</p>
                <p className="mt-1 text-xs text-muted">
                  {telegramIdentity?.username ? `@${telegramIdentity.username}` : `Telegram ID: ${telegramIdentity?.telegramUserId}`}
                  {telegramIdentity?.firstName ? ` (${telegramIdentity.firstName})` : ""}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Send <code className="rounded bg-slate-200 px-1 py-0.5 text-ink">/today</code> or <code className="rounded bg-slate-200 px-1 py-0.5 text-ink">/log</code> in Telegram to log your day at any time.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <a
                  href={`https://t.me/${botUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-sky-600"
                >
                  Open Bot in Telegram <ExternalLink className="size-3.5" />
                </a>

                <button
                  type="button"
                  onClick={unlinkTelegram}
                  className="inline-flex items-center gap-1.5 rounded-2xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  <Unlink className="size-3.5" /> Disconnect Telegram
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-5">
              <p className="text-sm leading-6 text-slate-600">
                Connect your personal Telegram account to capture daily notes on the go, receive gentle reminders, and review your weekly progress without opening a browser.
              </p>

              {!linkData ? (
                <div>
                  <button
                    type="button"
                    onClick={generateTelegramLink}
                    disabled={generatingToken}
                    className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-sky-100 transition hover:bg-sky-600 disabled:opacity-50"
                  >
                    {generatingToken ? (
                      <>
                        <RefreshCw className="size-4 animate-spin" /> Generating Link...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" /> Connect Telegram Bot
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-4 rounded-2xl border border-sky-100 bg-sky-50/50 p-5">
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-800">Step 1: One-Click Connection</span>
                    <p className="mt-1 text-xs text-slate-600">
                      Click the button below to open Telegram with your secure single-use linking token:
                    </p>
                    <div className="mt-3">
                      <a
                        href={linkData.deepLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600"
                      >
                        Open @{botUsername} in Telegram <ExternalLink className="size-4" />
                      </a>
                    </div>
                  </div>

                  <div className="border-t border-sky-100 pt-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-sky-800">Step 2: Or Link Manually</span>
                    <p className="mt-1 text-xs text-slate-600">
                      If the link does not open, search for <strong>@{botUsername}</strong> on Telegram and send:
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <code className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs font-semibold text-slate-800">
                        /start {linkData.rawToken}
                      </code>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-brand hover:text-brand"
                      >
                        {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                        {copied ? "Copied!" : "Copy Code"}
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    This link expires in 10 minutes and can only be used once. Your raw notes and entries remain strictly confidential.
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="size-4 text-emerald-600" />
                Tokens are cryptographically hashed and bound to your student account only.
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
