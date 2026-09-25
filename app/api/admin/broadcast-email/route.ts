import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";
import { sendEmail, createVerificationToken } from "@/src/lib/email";
import { renderBrandedEmail, type EmailTemplateKey } from "@/src/lib/email-templates";
import { env } from "@/src/lib/env";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json();

    const {
      target = "ALL", // ALL, STUDENTS, UNVERIFIED, TEST_ME, or specific email
      templateKey = "CUSTOM",
      subject,
      bodyHtml,
      actionUrl,
      actionLabel,
    } = body as {
      target: string;
      templateKey: EmailTemplateKey;
      subject: string;
      bodyHtml: string;
      actionUrl?: string;
      actionLabel?: string;
    };

    if (!subject || !bodyHtml) {
      return NextResponse.json({ error: "Subject and message body are required" }, { status: 400 });
    }

    // Determine target recipient users
    let recipients: Array<{ id: string; email: string; name: string | null }> = [];

    if (target === "TEST_ME") {
      if (!admin.email) {
        return NextResponse.json({ error: "Your admin account does not have an email address configured" }, { status: 400 });
      }
      recipients = [{ id: admin.userId, email: admin.email, name: admin.name }];
    } else if (target === "UNVERIFIED") {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, emailVerified: null, email: { not: null } },
        select: { id: true, email: true, name: true },
      });
      recipients = users.map((u) => ({ id: u.id, email: u.email!, name: u.name }));
    } else if (target === "STUDENTS") {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, role: "STUDENT", email: { not: null } },
        select: { id: true, email: true, name: true },
      });
      recipients = users.map((u) => ({ id: u.id, email: u.email!, name: u.name }));
    } else if (target === "ALL") {
      const users = await prisma.user.findMany({
        where: { deletedAt: null, email: { not: null } },
        select: { id: true, email: true, name: true },
      });
      recipients = users.map((u) => ({ id: u.id, email: u.email!, name: u.name }));
    } else {
      // Specific email
      const user = await prisma.user.findFirst({
        where: { email: target },
        select: { id: true, email: true, name: true },
      });
      if (user?.email) {
        recipients = [{ id: user.id, email: user.email, name: user.name }];
      } else {
        recipients = [{ id: "external", email: target, name: null }];
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No matching recipients found for the selected audience" }, { status: 400 });
    }

    let sentCount = 0;
    let failedCount = 0;

    // Send emails in batches of 5 to avoid connection flooding
    const BATCH_SIZE = 5;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (recipient) => {
          try {
            const firstName = recipient.name ? recipient.name.split(" ")[0] : "Student";
            let finalActionUrl = actionUrl || env.appUrl;
            let finalActionLabel = actionLabel || "Open Dashboard";

            // If it's a verification template, generate their personal one-time token
            if (templateKey === "VERIFICATION") {
              const token = await createVerificationToken(recipient.email);
              finalActionUrl = `${env.appUrl}/verify-email?token=${token}&email=${encodeURIComponent(recipient.email)}`;
              finalActionLabel = "Verify My Email";
            }

            const html = renderBrandedEmail({
              title: subject,
              greeting: `Hello ${firstName},`,
              bodyHtml,
              actionUrl: finalActionUrl,
              actionLabel: finalActionLabel,
              footerNote: templateKey === "VERIFICATION" ? "This verification link is valid for 24 hours." : undefined,
            });

            const result = await sendEmail({
              to: recipient.email,
              subject,
              html,
            });

            if (result.success) {
              sentCount++;
            } else {
              failedCount++;
            }
          } catch (e) {
            console.error(`Error sending email to ${recipient.email}:`, e);
            failedCount++;
          }
        })
      );
    }

    // Record audit event
    await prisma.auditEvent.create({
      data: {
        userId: admin.userId,
        action: "BROADCAST_EMAIL",
        entityType: "EmailBroadcast",
        entityId: templateKey,
        metadata: {
          target,
          templateKey,
          subject,
          totalRecipients: recipients.length,
          sentCount,
          failedCount,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      totalRecipients: recipients.length,
      sentCount,
      failedCount,
    });
  } catch (err) {
    return jsonError(err);
  }
}
