import { NextResponse } from "next/server";
import { env } from "@/src/lib/env";
import { getViewer } from "@/src/lib/viewer";
import { prisma } from "@/src/lib/prisma";
import { runDailyReminderSweep } from "@/src/core/notifications/notification-service";
import type { Prisma } from "@prisma/client";

async function isAuthorized(request: Request): Promise<boolean> {
  const authHeader = request.headers.get("authorization");
  if (env.cronSecret && authHeader === `Bearer ${env.cronSecret}`) {
    return true;
  }

  // Also allow admins to trigger via browser or API
  const viewer = await getViewer();
  if (viewer?.role === "ADMIN") {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    const authorized = await isAuthorized(request);
    if (!authorized) {
      return NextResponse.json(
        { error: "Unauthorized. Provide valid Bearer CRON_SECRET or Admin session." },
        { status: 401 }
      );
    }

    let dateOverride: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.date === "string") {
        dateOverride = body.date;
      }
    } catch {
      // Body is optional
    }

    const sweepResult = await runDailyReminderSweep({ dateOverride });

    // Record job execution in database
    await prisma.job.create({
      data: {
        type: "SEND_REMINDER",
        status: sweepResult.errors.length > 0 ? "FAILED" : "SUCCEEDED",
        payload: sweepResult as unknown as Prisma.InputJsonValue,
        completedAt: new Date(),
        lastError: sweepResult.errors.length > 0 ? sweepResult.errors.join("; ") : null,
      },
    });

    return NextResponse.json({
      ok: true,
      sweepResult,
    });
  } catch (error) {
    console.error("Failed to execute daily reminder sweep:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to run reminder sweep" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
