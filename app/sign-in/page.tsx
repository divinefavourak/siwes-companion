import Link from "next/link";
import Image from "next/image";
import { hasGoogleAuth } from "@/src/lib/env";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

export default function SignInPage() {
  return (
    <main className="shell-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/90 p-8 shadow-soft backdrop-blur-xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
            <Image
              src="/r2rlogo.png"
              alt="R2R SIWES Companion"
              width={48}
              height={48}
              className="size-full object-contain"
              priority
            />
          </div>
          <div>
            <span className="block font-bold tracking-tight text-slate-900 text-base">
              SIWES Companion
            </span>
            <span className="block text-xs font-medium text-slate-500">
              R2R Industrial Training Studio
            </span>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-brand">
          <CheckCircle2 className="size-3.5" /> Authentic Academic & IT Record
        </div>

        <h1 className="mt-3 text-balance text-3xl font-bold tracking-[-0.03em] text-slate-900">
          Document your SIWES. Defend with confidence.
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Transform daily engineering and technical work into supervisor-ready logbook entries, monthly summaries, and defense presentations.
        </p>

        <div className="mt-8 space-y-3">
          {hasGoogleAuth() ? (
            <Link
              className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 shadow-sm"
              href="/api/auth/signin/google"
            >
              Continue with Institutional Google
            </Link>
          ) : null}

          <Link
            className="group flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-brand hover:bg-sky-50/50 hover:text-brand"
            href="/dashboard"
          >
            <span>Open Student Workspace</span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 flex items-start gap-2.5 text-xs leading-5 text-slate-500">
          <ShieldCheck className="size-4 shrink-0 text-emerald-600 mt-0.5" />
          <span>
            Academic Integrity Guarantee: Entries are strictly derived from your recorded notes. Never manufactured or embellished.
          </span>
        </div>
      </section>
    </main>
  );
}
