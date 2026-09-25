import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { prisma } from "@/src/lib/prisma";
import {
  getNotificationPreference,
  updateNotificationPreference,
  createNotification,
} from "@/src/core/notifications/notification-service";
import { sendTelegramTestMessage } from "@/src/adapters/telegram/telegram-sender";
import { jsonError } from "@/src/lib/api";

export async function GET() {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const [preference, telegramIdentity] = await Promise.all([
      getNotificationPreference(viewer.id),
      prisma.telegramIdentity.findUnique({ where: { userId: viewer.id } }),
    ]);

    return NextResponse.json({
      preference,
      telegramLinked: Boolean(telegramIdentity),
      email: viewer.email,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updated = await updateNotificationPreference(viewer.id, {
      dailyReminderTelegram: typeof body.dailyReminderTelegram === "boolean" ? body.dailyReminderTelegram : undefined,
      dailyReminderEmail: typeof body.dailyReminderEmail === "boolean" ? body.dailyReminderEmail : undefined,
      weeklyRollupEmail: typeof body.weeklyRollupEmail === "boolean" ? body.weeklyRollupEmail : undefined,
      reminderHour: typeof body.reminderHour === "number" ? body.reminderHour : undefined,
    });

    return NextResponse.json({ preference: updated });
  } catch (error) {
    return jsonError(error);
  }
}

/**
 * Trigger an immediate test notification to verify all active channels for this user.
 */
export async function POST() {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    // 1. Create In-App Test Notification
    await createNotification({
      userId: viewer.id,
      title: "Test Notification Verified",
      message: "Your SIWES Companion notifications are working properly! You will receive daily nudges at 5:00 PM WAT on working days.",
      type: "SUCCESS",
      link: "/settings",
    });

    // 2. Send Telegram Test Message if connected
    let telegramSent = false;
    const telegramIdentity = await prisma.telegramIdentity.findUnique({
      where: { userId: viewer.id },
    });

    if (telegramIdentity?.telegramUserId) {
      telegramSent = await sendTelegramTestMessage({
        telegramUserId: telegramIdentity.telegramUserId,
        studentName: viewer.name,
      });
    }

    return NextResponse.json({
      ok: true,
      inAppSent: true,
      telegramSent,
      telegramLinked: Boolean(telegramIdentity),
    });
  } catch (error) {
    return jsonError(error);
  }
}
