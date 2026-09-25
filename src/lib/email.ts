import crypto from "node:crypto";
import { env } from "@/src/lib/env";
import { prisma } from "@/src/lib/prisma";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

function htmlToPlainText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<a\s+[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, "$2 ($1)")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\n\s+\n/g, "\n\n")
    .trim();
}

/**
 * Sends an email using the Resend REST API via native fetch.
 * If RESEND_API_KEY is not configured, logs to console in development.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  if (!env.resendApiKey) {
    console.warn(`[Resend Mock] Email to ${to} not sent (RESEND_API_KEY not configured). Subject: "${subject}"`);
    return { success: true, id: "mock-id" };
  }

  const plainText = text || htmlToPlainText(html);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [to],
        reply_to: replyTo || "siwescompanion@akanbi.dev",
        subject,
        html,
        text: plainText,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Resend API error:", data);
      return { success: false, error: data?.message || "Failed to send email" };
    }

    return { success: true, id: data.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error";
    console.error("Failed to connect to Resend API:", message);
    return { success: false, error: message };
  }
}

/**
 * Generates and stores a verification token in the VerificationToken table.
 * Valid for 24 hours.
 */
export async function createVerificationToken(email: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Clear any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return token;
}

/**
 * Sends a verification email to a student with a secure 1-click verification link.
 */
export async function sendVerificationEmail(email: string, name?: string | null): Promise<{ success: boolean; error?: string }> {
  const token = await createVerificationToken(email);
  const verifyUrl = `${env.appUrl}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

  const recipientName = name ? name.split(" ")[0] : "Student";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email - SIWES Companion</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 520px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 40px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <div style="text-align: center; margin-bottom: 28px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #0284c7; margin: 0;">SIWES Companion</h2>
      <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Industrial Training Documentation Studio</p>
    </div>

    <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center;">Verify your email address</h1>
    
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 24px 0;">
      Hello ${recipientName},
    </p>

    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 28px 0;">
      Thank you for creating an account on SIWES Companion. Please click the button below to confirm your email address and activate your account.
    </p>

    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);">
        Verify My Email
      </a>
    </div>

    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 0 0 16px 0;">
      This link will expire in <strong>24 hours</strong>. If you did not create an account, you can safely ignore this email.
    </p>

    <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center;">
      <p style="margin: 0 0 8px 0;">Having trouble with the button? Copy and paste this URL into your browser:</p>
      <p style="margin: 0; word-break: break-all; color: #0284c7;">${verifyUrl}</p>
    </div>

  </div>
</body>
</html>
  `.trim();

  const text = `Hello ${recipientName},\n\nPlease verify your email address on SIWES Companion by visiting this link:\n${verifyUrl}\n\nThis link expires in 24 hours. If you did not sign up, please ignore this email.`;

  return sendEmail({
    to: email,
    subject: "Verify your email — SIWES Companion",
    html,
    text,
  });
}

/**
 * Validates a verification token and marks the User as emailVerified in the database.
 */
export async function verifyEmailToken(email: string, token: string): Promise<{ success: boolean; error?: string }> {
  const record = await prisma.verificationToken.findFirst({
    where: {
      identifier: email,
      token,
    },
  });

  if (!record) {
    return { success: false, error: "Invalid verification link. Please request a new one." };
  }

  if (record.expires < new Date()) {
    await prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token } } });
    return { success: false, error: "This verification link has expired. Please request a new one." };
  }

  // Update user verified date
  await prisma.user.updateMany({
    where: { email },
    data: { emailVerified: new Date() },
  });

  // Remove the consumed token
  await prisma.verificationToken.delete({
    where: { identifier_token: { identifier: email, token } },
  });

  return { success: true };
}
