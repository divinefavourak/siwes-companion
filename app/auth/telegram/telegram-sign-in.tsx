"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { AlertCircle, Loader2 } from "lucide-react";
import type { TelegramLinkDestination } from "@/src/lib/telegram-link-destinations";

export function TelegramSignIn({ token, destination }: { token: string; destination: TelegramLinkDestination }) {
  const router = useRouter();
  const [failed, setFailed] = useState(!token);
  // The token is single-use; React strict mode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    signIn("telegram-link", { token, redirect: false })
      .then((result) => {
        if (result?.error) {
          setFailed(true);
          return;
        }
        router.replace(destination);
        router.refresh();
      })
      .catch(() => setFailed(true));
  }, [token, destination, router]);

  return (
    <main className="shell-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <section className="glass w-full max-w-md rounded-[28px] border border-slate-200/80 bg-white/95 p-8 text-center shadow-soft backdrop-blur-xl">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="relative size-12 shrink-0 overflow-hidden rounded-2xl border border-sky-100 bg-white p-1 shadow-sm">
            <Image src="/r2rlogo.png" alt="SIWES Companion" width={48} height={48} className="size-full object-contain" priority />
          </div>
          <span className="font-bold tracking-tight text-slate-900">SIWES Companion</span>
        </div>

        {failed ? (
          <div className="flex flex-col items-center">
            <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
              <AlertCircle className="size-8" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">This link has expired</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Sign-in links from Telegram work once and last 10 minutes. Tap <strong>Open web</strong> in the bot to get a new one.
            </p>
            <Link
              href="/sign-in"
              className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign in with email instead
            </Link>
          </div>
        ) : (
          <div className="flex flex-col items-center" role="status" aria-live="polite">
            <Loader2 className="mb-4 size-8 animate-spin text-brand" />
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">Signing you in…</h1>
            <p className="mt-2 text-sm text-slate-500">{destination === "/dashboard" ? "Taking you to your dashboard." : "Taking you to your password settings."}</p>
          </div>
        )}
      </section>
    </main>
  );
}
