import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { env } from "@/src/lib/env";
import { sendEmail } from "@/src/lib/email";
import { renderBrandedEmail } from "@/src/lib/email-templates";
import { hashLinkToken } from "@/src/core/telegram/link-service";
import type { TelegramLinkDestination } from "@/src/lib/telegram-link-destinations";

// Both token kinds live in VerificationToken (no schema change). Only the SHA-256 hash of
// the secret is stored; the identifier carries the purpose and owner:
//   tg-email:<userId>:<email>   confirm an email typed into the bot (24h)
//   tg-login:<userId>           one-tap web sign-in from the bot (10 min)
const EMAIL_TOKEN_PREFIX = "tg-email:";
const LOGIN_TOKEN_PREFIX = "tg-login:";
const EMAIL_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const LOGIN_TOKEN_TTL_MS = 10 * 60 * 1000;

const emailSchema = z.string().trim().toLowerCase().email().max(254);

// Confirmation emails go to whatever address a student types, so cap them per student and per
// recipient. Tokens are kept (not replaced) until used or expired so both counts see past sends.
const EMAIL_SENDS_PER_HOUR = 3;

export type EmailRequestResult = {
  email: string;
  status:
    | "verification_sent" // new address: confirm it to attach it to this account
    | "link_sent" // address belongs to a web account: confirm to connect Telegram to it
    | "invalid"
    | "linked_elsewhere" // that web account already has a different Telegram
    | "both_have_programmes" // merging would mean choosing between two programmes
    | "rate_limited"
    | "unavailable"
    | "send_failed";
};

export type EmailConfirmResult = {
  status:
    | "verified"
    | "linked"
    | "sign_in_required" // the web account can sign in: its owner must be signed in to merge
    | "expired"
    | "conflict_telegram"
    | "conflict_programmes"
    | "unavailable";
  email?: string;
  telegramUserId?: string;
};

export type TelegramRequester = { username: string | null; firstName: string | null };

export type EmailTokenDetails =
  | { valid: false }
  | {
      valid: true;
      kind: "verify" | "link";
      email: string;
      /** The web account that would absorb the Telegram account (link only). */
      ownerId: string | null;
      /** True when the owner can sign in, so the merge must be confirmed while signed in as them. */
      ownerMustSignIn: boolean;
      requester: TelegramRequester;
    };

export interface TelegramAccounts {
  getEmail(userId: string): Promise<{ email: string | null; verified: boolean; hasPassword: boolean }>;
  requestEmail(input: { userId: string; email: string }): Promise<EmailRequestResult>;
  createWebLoginUrl(userId: string, destination?: TelegramLinkDestination): Promise<string>;
  canSafelyUnlink(userId: string): Promise<boolean>;
}

function newSecret() {
  const raw = randomBytes(32).toString("base64url");
  return { raw, hash: hashLinkToken(raw) };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function parseEmailIdentifier(identifier: string): { userId: string; email: string } | null {
  if (!identifier.startsWith(EMAIL_TOKEN_PREFIX)) return null;
  const rest = identifier.slice(EMAIL_TOKEN_PREFIX.length);
  const split = rest.indexOf(":");
  if (split <= 0) return null;
  return { userId: rest.slice(0, split), email: rest.slice(split + 1) };
}

/** "Ada (@ada_dev)", "@ada_dev", "Ada" or a neutral fallback. Plain text: escape before use in HTML. */
export function describeRequester(requester: TelegramRequester): string {
  const handle = requester.username ? `@${requester.username}` : null;
  if (requester.firstName && handle) return `${requester.firstName} (${handle})`;
  return requester.firstName ?? handle ?? "a Telegram account without a public name";
}

export async function getEmail(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, emailVerified: true, passwordHash: true } });
  return { email: user?.email ?? null, verified: Boolean(user?.emailVerified), hasPassword: Boolean(user?.passwordHash) };
}

export async function requestEmail(input: { userId: string; email: string }): Promise<EmailRequestResult> {
  const parsed = emailSchema.safeParse(input.email);
  if (!parsed.success) return { status: "invalid", email: input.email.trim() };
  const email = parsed.data;

  const owner = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, deletedAt: true, telegramIdentity: { select: { id: true } }, _count: { select: { programmes: true } } }
  });
  if (owner?.deletedAt) return { status: "unavailable", email };
  if (owner && owner.id !== input.userId && owner.telegramIdentity) return { status: "linked_elsewhere", email };
  const isLink = Boolean(owner && owner.id !== input.userId);
  // Catch the merge conflict now rather than emailing a link that can only fail when clicked.
  if (isLink && owner && owner._count.programmes > 0) {
    const ownProgrammes = await prisma.siwesProgramme.count({ where: { userId: input.userId } });
    if (ownProgrammes > 0) return { status: "both_have_programmes", email };
  }

  // A token issued within the last hour still has more than (TTL - 1h) left to live.
  const now = Date.now();
  const issuedWithinHour = { gt: new Date(now + EMAIL_TOKEN_TTL_MS - 60 * 60 * 1000) };
  await prisma.verificationToken.deleteMany({ where: { identifier: { startsWith: EMAIL_TOKEN_PREFIX }, expires: { lte: new Date(now) } } });
  const [sentByStudent, sentToRecipient] = await Promise.all([
    prisma.verificationToken.count({ where: { identifier: { startsWith: `${EMAIL_TOKEN_PREFIX}${input.userId}:` }, expires: issuedWithinHour } }),
    prisma.verificationToken.count({ where: { identifier: { startsWith: EMAIL_TOKEN_PREFIX, endsWith: `:${email}` }, expires: issuedWithinHour } })
  ]);
  if (sentByStudent >= EMAIL_SENDS_PER_HOUR || sentToRecipient >= EMAIL_SENDS_PER_HOUR) return { status: "rate_limited", email };

  const requester = await prisma.telegramIdentity.findUnique({ where: { userId: input.userId }, select: { username: true, firstName: true } });
  const requesterLabel = escapeHtml(describeRequester({ username: requester?.username ?? null, firstName: requester?.firstName ?? null }));

  const secret = newSecret();
  await prisma.verificationToken.create({
    data: {
      identifier: `${EMAIL_TOKEN_PREFIX}${input.userId}:${email}`,
      token: secret.hash,
      expires: new Date(now + EMAIL_TOKEN_TTL_MS)
    }
  });

  const confirmUrl = `${env.appUrl}/telegram/confirm?token=${secret.raw}`;
  const html = renderBrandedEmail(
    isLink
      ? {
          title: "Connect Telegram to your account",
          greeting: `Hello ${escapeHtml(owner?.name?.split(" ")[0] ?? "there")},`,
          bodyHtml: `<p>The Telegram account <strong>${requesterLabel}</strong> asked to connect to your SIWES Companion account (<strong>${escapeHtml(email)}</strong>).</p><p>Only continue if that Telegram account is yours. Connecting lets it log entries and sign in to your account. You'll be asked to sign in to confirm. If you don't recognise it, ignore this email and nothing will change.</p>`,
          actionUrl: confirmUrl,
          actionLabel: "Review request",
          footerNote: "This link works once and expires in 24 hours."
        }
      : {
          title: "Confirm your email",
          greeting: "Hello,",
          bodyHtml: `<p>The Telegram account <strong>${requesterLabel}</strong> asked to use <strong>${escapeHtml(email)}</strong> as the email for its SIWES Companion account. Confirming lets you sign in on the web and recover your logbook if you lose access to Telegram.</p>`,
          actionUrl: confirmUrl,
          actionLabel: "Confirm email",
          footerNote: "This link works once and expires in 24 hours. If you didn't request it, ignore this email."
        }
  );
  const sent = await sendEmail({
    to: email,
    subject: isLink ? "Connect Telegram to your SIWES Companion account" : "Confirm your email — SIWES Companion",
    html
  });
  if (!sent.success) {
    await prisma.verificationToken.deleteMany({ where: { token: secret.hash } });
    return { status: "send_failed", email };
  }
  return { status: isLink ? "link_sent" : "verification_sent", email };
}

/** Read-only lookup for the confirmation page, so link scanners that prefetch it consume nothing. */
export async function describeEmailToken(rawToken: string): Promise<EmailTokenDetails> {
  if (!rawToken) return { valid: false };
  const record = await prisma.verificationToken.findUnique({ where: { token: hashLinkToken(rawToken) } });
  const parsed = record ? parseEmailIdentifier(record.identifier) : null;
  if (!record || !parsed || record.expires <= new Date()) return { valid: false };
  const [owner, requester] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.email }, select: { id: true, passwordHash: true, _count: { select: { accounts: true } } } }),
    prisma.telegramIdentity.findUnique({ where: { userId: parsed.userId }, select: { username: true, firstName: true } })
  ]);
  const isLink = Boolean(owner && owner.id !== parsed.userId);
  return {
    valid: true,
    kind: isLink ? "link" : "verify",
    email: parsed.email,
    ownerId: isLink && owner ? owner.id : null,
    ownerMustSignIn: Boolean(isLink && owner && (owner.passwordHash || owner._count.accounts > 0)),
    requester: { username: requester?.username ?? null, firstName: requester?.firstName ?? null }
  };
}

/**
 * Confirm an emailed token. `confirmingUserId` is the signed-in web user, if any: merging a
 * Telegram account into a web account that can sign in requires being signed in as its owner,
 * so a phishing request can't be approved by a single absent-minded click on the email.
 */
export async function confirmEmailToken(rawToken: string, confirmingUserId: string | null): Promise<EmailConfirmResult> {
  if (!rawToken) return { status: "expired" };
  const tokenHash = hashLinkToken(rawToken);

  return prisma.$transaction(async (tx) => {
    const record = await tx.verificationToken.findUnique({ where: { token: tokenHash } });
    const parsed = record ? parseEmailIdentifier(record.identifier) : null;
    if (!record || !parsed) return { status: "expired" } satisfies EmailConfirmResult;
    if (record.expires <= new Date()) {
      await tx.verificationToken.delete({ where: { token: tokenHash } });
      return { status: "expired" } satisfies EmailConfirmResult;
    }

    const { email } = parsed;
    const owner = await tx.user.findUnique({
      where: { email },
      include: { telegramIdentity: true, _count: { select: { programmes: true, accounts: true } } }
    });
    const isLink = Boolean(owner && owner.id !== parsed.userId);
    // Checked before the token is consumed, so the owner can sign in and reuse the same link.
    if (isLink && owner && (owner.passwordHash || owner._count.accounts > 0) && confirmingUserId !== owner.id) {
      return { status: "sign_in_required", email } satisfies EmailConfirmResult;
    }

    // Consume this token and any other pending email tokens for the same Telegram account.
    await tx.verificationToken.deleteMany({ where: { identifier: { startsWith: `${EMAIL_TOKEN_PREFIX}${parsed.userId}:` } } });

    const telegramUser = await tx.user.findUnique({
      where: { id: parsed.userId },
      include: { telegramIdentity: true, _count: { select: { programmes: true, accounts: true } } }
    });
    if (!telegramUser || telegramUser.deletedAt) return { status: "expired", email } satisfies EmailConfirmResult;
    const telegramUserId = telegramUser.telegramIdentity?.telegramUserId;

    // Case 1: the address is free (or already this user's): attach it and mark it verified.
    if (!owner || !isLink) {
      await tx.user.update({ where: { id: telegramUser.id }, data: { email, emailVerified: new Date() } });
      return { status: "verified", email, telegramUserId } satisfies EmailConfirmResult;
    }

    // Case 2: the address belongs to a web account: fold the Telegram-only account into it.
    if (owner.deletedAt) return { status: "unavailable", email } satisfies EmailConfirmResult;
    if (!telegramUser.telegramIdentity || telegramUser.email || telegramUser.passwordHash || telegramUser._count.accounts > 0) {
      return { status: "unavailable", email } satisfies EmailConfirmResult;
    }
    if (owner.telegramIdentity && owner.telegramIdentity.telegramUserId !== telegramUserId) {
      return { status: "conflict_telegram", email } satisfies EmailConfirmResult;
    }
    if (telegramUser._count.programmes > 0 && owner._count.programmes > 0) {
      return { status: "conflict_programmes", email } satisfies EmailConfirmResult;
    }

    // What survives the merge, explicitly:
    // - moved to the owner: programmes (entries, evidence and summaries follow via programmeId),
    //   notifications, LLM usage and audit events;
    // - the Telegram identity is re-created on the owner below;
    // - dropped with the placeholder: its bot conversation state, notification preferences (the
    //   owner keeps their own) and Telegram link tokens (only web users create those). There are
    //   no Session rows to move: sessions are JWTs.
    const from = { userId: telegramUser.id };
    const to = { userId: owner.id };
    await tx.siwesProgramme.updateMany({ where: from, data: to });
    await tx.notification.updateMany({ where: from, data: to });
    await tx.llmUsage.updateMany({ where: from, data: to });
    await tx.auditEvent.updateMany({ where: from, data: to });
    const identity = telegramUser.telegramIdentity;
    await tx.telegramIdentity.delete({ where: { id: identity.id } });
    await tx.botConversationState.deleteMany({ where: from });
    await tx.user.delete({ where: { id: telegramUser.id } });
    await tx.telegramIdentity.upsert({
      where: { userId: owner.id },
      update: { telegramUserId: identity.telegramUserId, username: identity.username, firstName: identity.firstName, lastSeenAt: new Date() },
      create: { userId: owner.id, telegramUserId: identity.telegramUserId, username: identity.username, firstName: identity.firstName }
    });
    if (!owner.emailVerified) await tx.user.update({ where: { id: owner.id }, data: { emailVerified: new Date() } });
    await tx.auditEvent.create({
      data: {
        userId: owner.id,
        action: "TELEGRAM_ACCOUNT_MERGED",
        entityType: "TelegramIdentity",
        entityId: identity.telegramUserId,
        metadata: { mergedUserId: telegramUser.id, programmesMoved: telegramUser._count.programmes }
      }
    });
    return { status: "linked", email, telegramUserId: identity.telegramUserId } satisfies EmailConfirmResult;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function createWebLoginUrl(userId: string, destination: TelegramLinkDestination = "/dashboard"): Promise<string> {
  const secret = newSecret();
  await prisma.verificationToken.deleteMany({ where: { identifier: `${LOGIN_TOKEN_PREFIX}${userId}` } });
  await prisma.verificationToken.create({
    data: { identifier: `${LOGIN_TOKEN_PREFIX}${userId}`, token: secret.hash, expires: new Date(Date.now() + LOGIN_TOKEN_TTL_MS) }
  });
  const next = destination === "/dashboard" ? "" : `&next=${encodeURIComponent(destination)}`;
  return `${env.appUrl}/auth/telegram?token=${secret.raw}${next}`;
}

/** Single use: the row is deleted before the user is returned, and a lost race returns null. */
export async function consumeWebLoginToken(rawToken: string) {
  if (!rawToken) return null;
  const tokenHash = hashLinkToken(rawToken);
  const record = await prisma.verificationToken.findUnique({ where: { token: tokenHash } });
  if (!record || !record.identifier.startsWith(LOGIN_TOKEN_PREFIX)) return null;
  const { count } = await prisma.verificationToken.deleteMany({ where: { token: tokenHash } });
  if (count === 0 || record.expires <= new Date()) return null;
  const user = await prisma.user.findUnique({
    where: { id: record.identifier.slice(LOGIN_TOKEN_PREFIX.length) },
    select: { id: true, name: true, email: true, deletedAt: true }
  });
  return user && !user.deletedAt ? user : null;
}

/**
 * Telegram may only be unlinked when another way to sign in exists: a password or an OAuth
 * account. An email alone is not enough, because there is no email-link sign-in, and the
 * Telegram sign-in links stop working once Telegram is unlinked.
 */
export async function canSafelyUnlink(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, _count: { select: { accounts: true } } }
  });
  return Boolean(user && (user.passwordHash || user._count.accounts > 0));
}

export const prismaTelegramAccounts: TelegramAccounts = { getEmail, requestEmail, createWebLoginUrl, canSafelyUnlink };
