import Link from "next/link";
import { hasGoogleAuth } from "@/src/lib/env";

export default function SignInPage() {
  return (
    <main className="shell-gradient flex min-h-screen items-center justify-center px-5 py-10">
      <section className="glass w-full max-w-md rounded-[28px] border border-white p-8 shadow-soft">
        <div className="mb-10 flex items-center gap-3"><div className="grid size-10 place-items-center rounded-2xl bg-brand text-lg font-black text-white">S</div><span className="font-semibold tracking-tight">SIWES Companion</span></div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand">Your experience, clearly kept</p>
        <h1 className="text-balance text-4xl font-semibold tracking-[-0.04em]">A calmer way to keep your logbook current.</h1>
        <p className="mt-4 leading-7 text-muted">Capture a rough note, review a grounded draft, and keep your real work ready for your report.</p>
        <div className="mt-8 space-y-3">
          {hasGoogleAuth() ? <Link className="block w-full rounded-2xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700" href="/api/auth/signin/google">Continue with Google</Link> : null}
          <Link className="block w-full rounded-2xl border border-line bg-white px-4 py-3 text-center text-sm font-semibold text-ink transition hover:border-brand" href="/dashboard">Open local demo</Link>
        </div>
        <p className="mt-6 text-xs leading-5 text-muted">AI drafts are suggestions. The product keeps your original note and never invents experience.</p>
      </section>
    </main>
  );
}
