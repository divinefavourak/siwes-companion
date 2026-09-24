"use client";

import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface AdminConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel?: string;
  requireTyping?: string; // If set, user must type this exact string to confirm
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function AdminConfirmDialog({
  title,
  description,
  confirmLabel = "Confirm",
  requireTyping,
  onConfirm,
  onCancel,
  danger = true,
}: AdminConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const canConfirm = requireTyping ? typed === requireTyping : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-lift p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {danger && (
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-50 border border-red-100">
                <AlertTriangle className="size-5 text-red-600" />
              </div>
            )}
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

        {/* Typing confirmation */}
        {requireTyping && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-slate-500">
              Type <span className="font-mono font-bold text-slate-800">{requireTyping}</span> to confirm:
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition"
              placeholder={requireTyping}
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${
              danger
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand text-white hover:bg-brand-strong"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
