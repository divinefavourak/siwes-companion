import { NextResponse } from "next/server";
import { getViewer } from "@/src/lib/viewer";
import { getUserNotifications } from "@/src/core/notifications/notification-service";
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

    const data = await getUserNotifications(viewer.id, 25);
    return NextResponse.json(data);
  } catch (error) {
    return jsonError(error);
  }
}
