"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  RefreshCw,
  ShieldCheck
} from "lucide-react";

type Turn = {
  question: string;
  answer: string;
};

type DefenseFeedback = {
  questionsAnswered: string[];
  topicsCovered: string[];
  areasToReview: string[];
  questionsStruggledWith: string[];
};

const COMMON_PANEL_QUESTIONS = [
  {
    topic: "Organization & Placement Context",
    question: "Give a brief overview of your organization, the department you worked in, and its core mission."
  },
  {
    topic: "Technical Tools & Infrastructure",
    question: "What specific tools, software, or equipment did you operate or learn during your industrial training?"
  },
  {
    topic: "Problem Solving & Engineering",
    question: "Describe one significant technical challenge you encountered on the job and how you addressed it."
  },
  {
    topic: "Academic Alignment",
    question: "How does the practical experience you gained relate to the theoretical courses you have taken in your department?"
  },
  {
    topic: "Knowledge Transfer",
    question: "What recommendations would you give to the organization, and what advice would you give to next year's SIWES students?"
  }
];

export default function DefensePage() {
  const [session, setSession] = useState<{ id: string; question: string } | null>(null);
  const [turnIndex, setTurnIndex] = useState(1);
  const [answer, setAnswer] = useState("");
  const [turnsHistory, setTurnsHistory] = useState<Turn[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [feedback, setFeedback] = useState<DefenseFeedback | null>(null);
  const [showQuestionBank, setShowQuestionBank] = useState(false);

  async function startMockDefense() {
    setStarting(true);
    setFeedback(null);
    setTurnsHistory([]);
    setTurnIndex(1);
    setAnswer("");
    try {
      const response = await fetch("/api/defense/sessions", { method: "POST" });
      const payload = await response.json();
      if (payload.session) {
        setSession(payload.session);
      }
    } catch {
      // Offline fallback
    } finally {
      setStarting(false);
    }
  }

  async function submitAnswer() {
    if (!session || !answer.trim() || submitting) return;
    setSubmitting(true);
    const currentQ = session.question;
    const currentAns = answer.trim();

    try {
      const response = await fetch(`/api/defense/sessions/${session.id}/turns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer: currentAns })
      });
      const payload = await response.json();

      setTurnsHistory((prev) => [...prev, { question: currentQ, answer: currentAns }]);
      setAnswer("");

      if (payload.nextQuestion) {
        setTurnIndex((prev) => prev + 1);
        setSession({ id: session.id, question: payload.nextQuestion });
      } else if (payload.feedback) {
        setFeedback(payload.feedback);
        setSession(null);
      }
    } catch {
      // Offline fallback
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
          <GraduationCap className="size-3.5" /> Departmental Defense Center
        </div>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Practice Explaining Your Work
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-600 max-w-xl">
          University panels probe whether you actually carried out the work. Questions are generated directly from your reviewed entries and verified projects.
        </p>
      </div>

      {/* Main Start Panel */}
      <AnimatePresence mode="wait">
        {!session && !feedback && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="rounded-[28px] border border-slate-200/80 bg-white p-7 sm:p-8 shadow-soft text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-6"
          >
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
                <ShieldCheck className="size-3.5" /> Oral Defense Simulator
              </div>
              <h2 className="text-xl font-bold text-slate-900">Mock Examination Session</h2>
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                A 3-turn interactive oral defense session. The panel asks probing technical questions about tools, code, diagrams, and challenges from your logbook.
              </p>
            </div>

            <button
              type="button"
              onClick={startMockDefense}
              disabled={starting}
              className="mt-4 sm:mt-0 shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-50 min-h-[48px]"
            >
              {starting ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <GraduationCap className="size-4" />
              )}
              Start Defense Simulation
            </button>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Active Session */}
      <AnimatePresence>
        {session && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            {/* History of Completed Turns */}
            {turnsHistory.length > 0 && (
              <div className="space-y-4">
                {turnsHistory.map((turn, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-start gap-3">
                      <span className="grid size-6 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 shrink-0 mt-0.5">
                        Q{idx + 1}
                      </span>
                      <p className="text-sm font-semibold text-slate-800">{turn.question}</p>
                    </div>
                    <div className="ml-9 rounded-2xl bg-slate-50 border border-slate-100 p-4 text-xs leading-5 text-slate-600">
                      <span className="font-semibold text-slate-700 block mb-1">Your response:</span>
                      {turn.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Current Question Box */}
            <section className="rounded-[28px] border border-sky-200/90 bg-white p-7 shadow-soft">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-brand">
                  Panel Question {turnIndex} of 3
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-brand">
                  Live Turn
                </span>
              </div>

              <h2 className="mt-4 text-xl sm:text-2xl font-bold leading-relaxed text-slate-900">
                {session.question}
              </h2>

              <div className="mt-6">
                <label className="text-xs font-semibold text-slate-500">Your oral response:</label>
                <textarea
                  rows={5}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Explain clearly what you personally did, tools involved, why you chose that approach, and what you learned..."
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none transition focus:border-brand focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-slate-400">
                  Tip: Speak in the first person (&ldquo;I configured...&rdquo;, &ldquo;I implemented...&rdquo;).
                </p>

                <button
                  type="button"
                  onClick={submitAnswer}
                  disabled={!answer.trim() || submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-strong disabled:opacity-50 min-h-[44px]"
                >
                  {submitting ? (
                    <RefreshCw className="size-4 animate-spin" />
                  ) : (
                    <>
                      Submit Answer <ArrowRight className="size-4" />
                    </>
                  )}
                </button>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Feedback Evaluation Report Card */}
      <AnimatePresence>
        {feedback && (
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-[28px] border border-slate-200/80 bg-white p-7 sm:p-8 shadow-soft space-y-6"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-5">
              <div>
                <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" /> Defense Completed
                </div>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                  Panel Evaluation & Readiness
                </h2>
              </div>

              <button
                type="button"
                onClick={startMockDefense}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 min-h-[40px]"
              >
                <RefreshCw className="size-3.5" /> Practice Again
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Questions Answered
                </span>
                <p className="mt-2 text-2xl font-bold text-slate-900">{feedback.questionsAnswered.length}</p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {feedback.questionsAnswered.map((q, i) => (
                    <li key={i} className="line-clamp-2">&bull; {q}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl bg-slate-50 p-5 border border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Topics Covered
                </span>
                <p className="mt-2 text-2xl font-bold text-slate-900">{feedback.topicsCovered.length}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {feedback.topicsCovered.map((topic, i) => (
                    <span key={i} className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {feedback.areasToReview.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase tracking-wider">
                  <AlertCircle className="size-4 text-amber-600" /> Focus Areas for Department Defense
                </div>
                <p className="mt-2 text-xs leading-5 text-amber-800">
                  Before your departmental presentation, review the following topics:
                </p>
                <ul className="mt-2 list-disc pl-5 text-xs font-semibold text-amber-950 space-y-1">
                  {feedback.areasToReview.map((area, i) => (
                    <li key={i}>{area}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.questionsStruggledWith.length > 0 && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-5">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">
                  Questions Needing Technical Elaboration
                </span>
                <ul className="mt-2 space-y-2 text-xs text-rose-900">
                  {feedback.questionsStruggledWith.map((q, i) => (
                    <li key={i} className="rounded-xl bg-white p-3 border border-rose-100">
                      &ldquo;{q}&rdquo;
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>

      {/* Likely Question Bank Accordion with Framer Motion */}
      <section className="rounded-[28px] border border-slate-200/80 bg-white p-6 sm:p-7 shadow-sm">
        <button
          type="button"
          onClick={() => setShowQuestionBank(!showQuestionBank)}
          className="flex w-full items-center justify-between text-left min-h-[44px]"
        >
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-sky-50 text-brand">
              <BookOpen className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Standard Defense Question Bank</h3>
              <p className="text-xs text-slate-500">Standard questions frequently asked by university defense panels</p>
            </div>
          </div>
          {showQuestionBank ? (
            <ChevronUp className="size-5 text-slate-400" />
          ) : (
            <ChevronDown className="size-5 text-slate-400" />
          )}
        </button>

        <AnimatePresence>
          {showQuestionBank && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 space-y-3 border-t border-slate-100 pt-5 overflow-hidden"
            >
              {COMMON_PANEL_QUESTIONS.map((item, idx) => (
                <div key={idx} className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                  <span className="text-[11px] font-bold text-brand uppercase tracking-wider">
                    {item.topic}
                  </span>
                  <p className="mt-1 text-sm font-medium text-slate-800">{item.question}</p>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}
