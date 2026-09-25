import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { markAllNotificationsAsRead } from "@/src/core/notifications/notification-service";
import { jsonError } from "@/src/lib/api";

export async function POST() {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    await markAllNotificationsAsRead(viewer.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
