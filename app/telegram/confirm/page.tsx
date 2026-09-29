import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, MessageCircle } from "lucide-react";
import { describeEmailToken, type EmailConfirmResult } from "@/src/adapters/telegram/account-service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Confirm — SIWES Companion" };

type PageProps = { searchParams: Promise<{ token?: string; result?: string }> };

const RESULTS: Record<EmailConfirmResult["status"], { ok: boolean; title: string; body: string }> = {
  verified: {
    ok: true,
    title: "Email confirmed",
    body: "Your email is now on your account. Back in Telegram, tap Set a web password to sign in here with your email — or keep using Open web."
  },
  linked: { ok: true, title: "Telegram connected", body: "Your Telegram chat is now connected to this account, and anything you logged there is here too." },
  expired: { ok: false, title: "This link has expired", body: "Confirmation links work once and last 24 hours. Send /email to the bot to get a new one." },
  conflict_telegram: { ok: false, title: "Already connected", body: "This account is already connected to a different Telegram account. Disconnect it from Settings on the web first." },
  conflict_programmes: {
    ok: false,
    title: "Can't combine these accounts",
    body: "Both your web account and your Telegram account already have a SIWES programme, so they can't be merged automatically. Contact support and we'll help."
  },
  unavailable: { ok: false, title: "This link can't be used", body: "This account can't be connected this way. Send /email to the bot to try a different address." }
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="shell-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/95 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
            <Image src="/r2rlogo.png" alt="SIWES Companion" width={48} height={48} className="size-full object-contain" priority />
          </div>
          <span className="font-bold tracking-tight text-slate-900">SIWES Companion</span>
        </div>
        {children}
      </section>
    </main>
  );
}

function Outcome({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`mb-4 grid size-14 place-items-center rounded-2xl border ${ok ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-red-100 bg-red-50 text-red-600"}`}
      >
        {ok ? <CheckCircle2 className="size-8" /> : <AlertCircle className="size-8" />}
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
      <Link
        href="/sign-in"
        className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        Go to sign in
      </Link>
    </div>
  );
}

export default async function TelegramConfirmPage({ searchParams }: PageProps) {
  const { token, result } = await searchParams;

  if (result) {
    const outcome = RESULTS[result as EmailConfirmResult["status"]] ?? RESULTS.expired;
    return (
      <Shell>
        <Outcome {...outcome} />
      </Shell>
    );
  }

  const details = await describeEmailToken(token ?? "");
  if (!details.valid) {
    return (
      <Shell>
        <Outcome {...RESULTS.expired} />
      </Shell>
    );
  }

  const isLink = details.kind === "link";
  return (
    <Shell>
      <div className="flex flex-col items-center">
        <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-sky-100 bg-sky-50 text-brand">
          <MessageCircle className="size-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{isLink ? "Connect Telegram?" : "Confirm your email"}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {isLink ? (
            <>
              Connect your Telegram chat to the account for <strong>{details.email}</strong>. Anything you logged on Telegram moves into this
              account.
            </>
          ) : (
            <>
              Add <strong>{details.email}</strong> to your SIWES Companion account.
            </>
          )}
        </p>
        {/* A deliberate POST: email scanners that open links must not be able to confirm. */}
        <form method="post" action="/api/telegram/confirm-email" className="mt-6 w-full">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-brand px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-strong"
          >
            {isLink ? "Connect Telegram" : "Confirm email"}
          </button>
        </form>
      </div>
    </Shell>
  );
}
