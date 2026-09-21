"use client";

import { useState } from "react";

export default function DefensePage() {
  const [session, setSession] = useState<{ id: string; question: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<string[]>([]);
  async function start() { const response = await fetch("/api/defense/sessions", { method: "POST" }); const payload = await response.json(); setSession(payload.session); }
  async function submit() { if (!session) return; const response = await fetch(`/api/defense/sessions/${session.id}/turns`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }) }); const payload = await response.json(); setAnswer(""); if (payload.nextQuestion) setSession({ id: session.id, question: payload.nextQuestion }); if (payload.feedback) setFeedback(payload.feedback.areasToReview ?? []); }
  return <div className="mx-auto max-w-3xl space-y-8"><div><p className="text-sm font-semibold text-brand">Defense Center</p><h1 className="mt-2 text-4xl font-semibold tracking-[-0.05em]">Practice explaining your work.</h1><p className="mt-3 leading-7 text-muted">Questions are grounded in your reviewed history. There is no made-up score.</p></div>{!session ? <button onClick={start} className="rounded-2xl bg-brand px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200">Start mock defense</button> : <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Examiner question</p><h2 className="mt-3 text-2xl font-semibold leading-9">{session.question}</h2><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Answer in your own words…" className="mt-6 min-h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none focus:border-brand focus:bg-white" /><button onClick={submit} disabled={!answer.trim()} className="mt-4 rounded-2xl bg-ink px-5 py-3 text-sm font-semibold text-white">Submit answer</button>{feedback.length ? <div className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Review areas: {feedback.join(", ")}</div> : null}</section>}</div>;
}
