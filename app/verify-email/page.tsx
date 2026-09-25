import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, AlertCircle, ArrowRight, Mail } from "lucide-react";
import { verifyEmailToken } from "@/src/lib/email";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ token?: string; email?: string }>;
}

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token, email } = await searchParams;

  let verified = false;
  let errorMsg: string | null = null;

  if (token && email) {
    const result = await verifyEmailToken(email, token);
    if (result.success) {
      verified = true;
    } else {
      errorMsg = result.error || "Verification failed";
    }
  }

  return (
    <main className="shell-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/95 p-8 shadow-soft backdrop-blur-xl text-center">
        
        {/* Brand */}
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
            <Image
              src="/r2rlogo.png"
              alt="SIWES Companion"
              width={48}
              height={48}
              className="size-full object-contain"
              priority
            />
          </div>
          <div className="text-left">
            <span className="block font-bold tracking-tight text-slate-900 text-base">
              SIWES Companion
            </span>
            <span className="block text-xs font-medium text-slate-500">
              Email Verification
            </span>
          </div>
        </div>

        {/* State 1: Verification Successful */}
        {verified && (
          <div className="flex flex-col items-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
              <CheckCircle2 className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Email Verified!
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Your email address (<strong>{email}</strong>) has been confirmed successfully. You have full access to your SIWES studio.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        )}

        {/* State 2: Verification Failed / Expired */}
        {!verified && errorMsg && (
          <div className="flex flex-col items-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600 mb-4 border border-red-100">
              <AlertCircle className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Verification Failed
            </h1>
            <p className="mt-2 text-sm text-red-600 leading-relaxed">
              {errorMsg}
            </p>
            <p className="mt-3 text-xs text-slate-500">
              Verification tokens expire after 24 hours. Sign in to request a fresh verification link.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              <span>Go to Sign In</span>
            </Link>
          </div>
        )}

        {/* State 3: Direct visit without token */}
        {!verified && !errorMsg && (
          <div className="flex flex-col items-center">
            <div className="grid size-14 place-items-center rounded-2xl bg-sky-50 text-brand mb-4 border border-sky-100">
              <Mail className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Check Your Inbox
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              We sent a verification link to your email address. Click the link in the message to activate your student account.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <span>Back to Sign In</span>
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
