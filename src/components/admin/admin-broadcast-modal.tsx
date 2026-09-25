"use client";

import { useState } from "react";
import { Mail, Send, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, Sparkles, X } from "lucide-react";
import { EMAIL_TEMPLATES, type EmailTemplateKey } from "@/src/lib/email-templates";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTarget?: string;
  defaultEmail?: string;
}

export function AdminBroadcastModal({ isOpen, onClose, defaultTarget = "ALL", defaultEmail }: Props) {
  const [target, setTarget] = useState(defaultEmail || defaultTarget);
  const [templateKey, setTemplateKey] = useState<EmailTemplateKey>("ANNOUNCEMENT");
  const [subject, setSubject] = useState(EMAIL_TEMPLATES.ANNOUNCEMENT.defaultSubject);
  const [bodyHtml, setBodyHtml] = useState(EMAIL_TEMPLATES.ANNOUNCEMENT.defaultBody);
  const [actionLabel, setActionLabel] = useState(EMAIL_TEMPLATES.ANNOUNCEMENT.defaultActionLabel);
  const [actionUrl, setActionUrl] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);

  if (!isOpen) return null;

  function handleTemplateChange(key: EmailTemplateKey) {
    setTemplateKey(key);
    const tmpl = EMAIL_TEMPLATES[key];
    setSubject(tmpl.defaultSubject);
    setBodyHtml(tmpl.defaultBody);
    setActionLabel(tmpl.defaultActionLabel);
    if (key === "VERIFICATION") {
      setActionUrl("(auto-generated personal 1-click link)");
    } else {
      setActionUrl("");
    }
    setResult(null);
  }

  async function handleSend(isTest = false) {
    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/broadcast-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: isTest ? "TEST_ME" : target,
          templateKey,
          subject,
          bodyHtml,
          actionLabel,
          actionUrl: templateKey === "VERIFICATION" ? undefined : actionUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setResult({ ok: false, message: data.error || "Failed to dispatch emails" });
      } else {
        setResult({
          ok: true,
          message: isTest
            ? "Test email sent successfully to your admin inbox!"
            : `Broadcast complete! Successfully sent to ${data.sentCount} recipient(s). ${data.failedCount > 0 ? `(${data.failedCount} failed)` : ""}`,
        });
        setConfirmSend(false);
      }
    } catch {
      setResult({ ok: false, message: "A network error occurred while sending emails" });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-sky-50 text-brand border border-sky-100">
              <Mail className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Broadcast Email Dispatcher</h2>
              <p className="text-xs text-slate-500">Send templated or custom emails using Resend</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Status result banner */}
        {result && (
          <div
            className={`mt-4 flex items-center gap-2.5 rounded-xl p-3 text-xs font-medium border ${
              result.ok
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {result.ok ? (
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-4 shrink-0 text-red-600" />
            )}
            <span>{result.message}</span>
          </div>
        )}

        {/* Resend Sandbox Guidance Banner */}
        <div className="mt-4 rounded-xl bg-amber-50/80 border border-amber-200 p-3 text-xs text-amber-900 leading-relaxed">
          <p className="font-semibold flex items-center gap-1.5">
            <span>💡</span> Resend Domain Verification Required for Real Students
          </p>
          <p className="mt-0.5 text-[11px] text-amber-800">
            On the free testing tier without a verified domain, Resend strictly allows sending to your account email (<code>divinefavourakanbi07@gmail.com</code>). To broadcast to other students, add & verify a domain at <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline font-bold hover:text-amber-950">resend.com/domains</a> and set <code>RESEND_FROM_EMAIL</code>.
          </p>
        </div>

        <div className="mt-5 space-y-4 text-sm">
          
          {/* Target Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Audience
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none focus:border-brand focus:ring-2 focus:ring-sky-100"
            >
              <option value="ALL">All Registered Users (Broadcast)</option>
              <option value="STUDENTS">Students Only</option>
              <option value="UNVERIFIED">Unverified Users Only (Nudge to verify)</option>
              {defaultEmail && <option value={defaultEmail}>Specific User: {defaultEmail}</option>}
            </select>
          </div>

          {/* Template Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" /> Choose Email Template
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(EMAIL_TEMPLATES) as EmailTemplateKey[]).map((key) => {
                const isSelected = templateKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleTemplateChange(key)}
                    className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                      isSelected
                        ? "border-brand bg-sky-50/70 text-brand font-semibold shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {EMAIL_TEMPLATES[key].name}
                  </button>
                );
              })}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              {EMAIL_TEMPLATES[templateKey].description}
            </p>
          </div>

          {/* Subject Line */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Subject Line
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject line..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-brand focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Message Content (HTML or formatted text)
              </label>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                {showPreview ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                {showPreview ? "Hide Preview" : "Live Preview"}
              </button>
            </div>

            {showPreview ? (
              <div className="rounded-xl border border-sky-100 bg-slate-50 p-4 max-h-56 overflow-y-auto">
                <p className="text-xs text-slate-400 mb-2 font-mono">--- Preview in Branded Layout ---</p>
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 mb-1">{subject}</h3>
                  <p className="text-xs text-slate-600 mb-3">Hello Student,</p>
                  <div
                    className="text-xs text-slate-700 leading-relaxed space-y-2"
                    dangerouslySetInnerHTML={{ __html: bodyHtml }}
                  />
                  {actionLabel && (
                    <div className="mt-4 pt-3 border-t border-slate-100 text-center">
                      <span className="inline-block bg-brand text-white text-xs font-semibold px-4 py-2 rounded-lg">
                        {actionLabel}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <textarea
                rows={5}
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                placeholder="Write your email content..."
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 font-mono outline-none focus:border-brand focus:ring-2 focus:ring-sky-100"
              />
            )}
          </div>

          {/* CTA Button Settings */}
          {templateKey !== "VERIFICATION" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button Text (Optional)
                </label>
                <input
                  type="text"
                  value={actionLabel}
                  onChange={(e) => setActionLabel(e.target.value)}
                  placeholder="e.g. Open Dashboard"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Button URL (Optional)
                </label>
                <input
                  type="text"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  placeholder="e.g. https://swcompanion.akanbi.dev/defense"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={sending}
            onClick={() => handleSend(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Send Test to Me
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            {confirmSend ? (
              <button
                type="button"
                disabled={sending}
                onClick={() => handleSend(false)}
                className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-strong transition disabled:opacity-50"
              >
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                <span>Confirm & Send to {target}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={sending}
                onClick={() => setConfirmSend(true)}
                className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-strong transition disabled:opacity-50 shadow-sm"
              >
                <Send className="size-3.5" />
                <span>Send Broadcast</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
