import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { markNotificationAsRead } from "@/src/core/notifications/notification-service";
import { jsonError } from "@/src/lib/api";

export async function PATCH(
  _request: Request,
  props: { params: Promise<{ notificationId: string }> }
) {
  try {
    const viewer = await getViewer();
    if (!viewer) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Sign in required" } },
        { status: 401 }
      );
    }

    const { notificationId } = await props.params;
    await markNotificationAsRead(viewer.id, notificationId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
