export interface BrandedEmailOptions {
  title: string;
  preheader?: string;
  greeting?: string;
  bodyHtml: string;
  actionUrl?: string;
  actionLabel?: string;
  footerNote?: string;
}

/**
 * Responsive, branded email template matching SIWES Companion design language.
 */
export function renderBrandedEmail({
  title,
  preheader,
  greeting = "Hello,",
  bodyHtml,
  actionUrl,
  actionLabel,
  footerNote,
}: BrandedEmailOptions): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px; color: #1e293b;">
  <div style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; padding: 40px 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    
    <!-- Brand Header -->
    <div style="text-align: center; margin-bottom: 28px;">
      <h2 style="font-size: 20px; font-weight: 700; color: #0284c7; margin: 0; letter-spacing: -0.02em;">SIWES Companion</h2>
      <p style="font-size: 13px; color: #64748b; margin: 4px 0 0 0;">Industrial Training Documentation Studio</p>
    </div>

    <!-- Title -->
    <h1 style="font-size: 22px; font-weight: 700; color: #0f172a; margin: 0 0 16px 0; text-align: center; letter-spacing: -0.02em;">
      ${title}
    </h1>

    <!-- Greeting -->
    <p style="font-size: 15px; line-height: 1.6; color: #334155; margin: 0 0 20px 0;">
      ${greeting}
    </p>

    <!-- Body -->
    <div style="font-size: 15px; line-height: 1.6; color: #334155;">
      ${bodyHtml}
    </div>

    <!-- CTA Button -->
    ${
      actionUrl && actionLabel
        ? `
    <div style="text-align: center; margin: 32px 0;">
      <a href="${actionUrl}" style="background-color: #0284c7; color: #ffffff; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 2px 6px rgba(2, 132, 199, 0.3);">
        ${actionLabel}
      </a>
    </div>
        `
        : ""
    }

    <!-- Footer Note -->
    ${
      footerNote
        ? `
    <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin: 24px 0 0 0;">
      ${footerNote}
    </p>
        `
        : ""
    }

    <!-- Security & Footer Links -->
    <div style="border-top: 1px solid #f1f5f9; padding-top: 24px; margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.6;">
      <p style="margin: 0;">Sent by SIWES Companion Administration.</p>
      <p style="margin: 4px 0 0 0;">Strict academic grounding for Nigerian STEM industrial training.</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export type EmailTemplateKey = "VERIFICATION" | "LOGBOOK_REMINDER" | "DEFENSE_PREP" | "ANNOUNCEMENT" | "CUSTOM";

export interface TemplateDefinition {
  name: string;
  defaultSubject: string;
  description: string;
  defaultBody: string;
  defaultActionLabel: string;
}

export const EMAIL_TEMPLATES: Record<EmailTemplateKey, TemplateDefinition> = {
  VERIFICATION: {
    name: "Email Verification",
    defaultSubject: "Verify your email address — SIWES Companion",
    description: "Sends a personalized 24-hour verification link to unverified users.",
    defaultBody: "Thank you for creating your account on SIWES Companion. Please click the button below to confirm your email address and activate all features.",
    defaultActionLabel: "Verify My Email",
  },
  LOGBOOK_REMINDER: {
    name: "Weekly Logbook Reminder",
    defaultSubject: "Weekly Reminder: Update your daily SIWES logbook",
    description: "Nudges students to document their activities before the weekly rollup deadline.",
    defaultBody: `<p>Don't let your daily training notes pile up! Consistent, detailed documentation is essential for university supervisor approvals and grading.</p>
<p>Log into your studio or message our Telegram bot to capture what you worked on this week.</p>`,
    defaultActionLabel: "Open My Logbook",
  },
  DEFENSE_PREP: {
    name: "Oral Defense Practice",
    defaultSubject: "Prepare for your SIWES Defense — Practice Mock Questions",
    description: "Encourages students to test their technical recall against the AI examiner.",
    defaultBody: `<p>Your SIWES defense examination will test you on the specific tools, libraries, and projects you documented in your logbook.</p>
<p>Take 10 minutes today to practice answering simulated supervisor questions using our interactive Defense Simulator.</p>`,
    defaultActionLabel: "Start Practice Defense",
  },
  ANNOUNCEMENT: {
    name: "System Announcement",
    defaultSubject: "Important Announcement — SIWES Companion",
    description: "General broadcast notice or platform update to all registered students.",
    defaultBody: `<p>We are rolling out important updates to help you streamline your SIWES reporting.</p>
<p>Please check your dashboard for the latest guidelines and features.</p>`,
    defaultActionLabel: "Go to Dashboard",
  },
  CUSTOM: {
    name: "Custom / Blank Email",
    defaultSubject: "Notice from SIWES Companion Administration",
    description: "Write your own custom subject, message body, and button URL.",
    defaultBody: `<p>Write your custom announcement or instructions here.</p>`,
    defaultActionLabel: "View Details",
  },
};
