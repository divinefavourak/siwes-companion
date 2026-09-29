import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getViewer } from "@/src/lib/viewer";
import { prisma } from "@/src/lib/prisma";
import { MIN_PASSWORD_LENGTH } from "@/src/lib/auth-crypto";
import { PasswordForm } from "@/src/components/password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Password — SIWES Companion" };

export default async function PasswordSettingsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { email: true, passwordHash: true } });
  const hasPassword = Boolean(user?.passwordHash);

  return (
    <main className="shell-gradient min-h-screen px-5 py-10">
      <div className="mx-auto max-w-xl space-y-8">
        <div>
          <Link href="/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-brand transition hover:underline">
            <ArrowLeft className="size-4" /> Back to settings
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-brand">Account</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{hasPassword ? "Change password" : "Set a password"}</h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            {hasPassword
              ? "Enter your current password, then choose a new one."
              : "Add a password so you can sign in on the web with your email — no Telegram link needed."}
          </p>
        </div>

        <section className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
          {user?.email ? (
            <PasswordForm email={user.email} hasPassword={hasPassword} minLength={MIN_PASSWORD_LENGTH} />
          ) : (
            <p className="text-sm leading-6 text-slate-600">
              Your account doesn&apos;t have an email yet, and you sign in with your email and password. Send <strong>/email</strong> to the
              Telegram bot to add one, then come back here.
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
