"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

type Props = { email: string; hasPassword: boolean; minLength: number };

const inputClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

export function PasswordForm({ email, hasPassword, minLength }: Props) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (newPassword.length < minLength) return setError(`Use at least ${minLength} characters.`);
    if (newPassword !== confirmPassword) return setError("The two new passwords don't match.");

    setSaving(true);
    try {
      const response = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: hasPassword ? currentPassword : undefined, newPassword })
      });
      const payload = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        setError(payload.error?.message ?? "Your password couldn't be saved. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Your password couldn't be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center text-center" role="status">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">{hasPassword ? "Password changed" : "Password set"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          You can now sign in on the web with <strong>{email}</strong> and your password.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  const type = visible ? "text" : "password";
  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Lets password managers file the new password under the right account. */}
      <input type="text" name="username" autoComplete="username" value={email} readOnly hidden />

      {hasPassword && (
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Current password</span>
          <input
            type={type}
            autoComplete="current-password"
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">New password</span>
        <input
          type={type}
          autoComplete="new-password"
          required
          minLength={minLength}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          aria-describedby="password-hint"
          className={inputClass}
        />
        <span id="password-hint" className="mt-1.5 block text-xs text-slate-500">
          At least {minLength} characters.
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700">Confirm new password</span>
        <input
          type={type}
          autoComplete="new-password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={inputClass}
        />
      </label>

      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 transition hover:text-slate-900"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {visible ? "Hide passwords" : "Show passwords"}
      </button>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving && <Loader2 className="size-4 animate-spin" />}
        {hasPassword ? "Change password" : "Set password"}
      </button>
    </form>
  );
}
