import { NextResponse } from "next/server";
import { z } from "zod";
import { getViewer } from "@/src/lib/viewer";
import { prisma } from "@/src/lib/prisma";
import { hashPassword, verifyPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/src/lib/auth-crypto";
import { jsonError } from "@/src/lib/api";

const bodySchema = z.object({
  currentPassword: z.string().max(MAX_PASSWORD_LENGTH).optional(),
  newPassword: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, "That password is too long")
});

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/**
 * Set a first password (accounts created through Telegram have none) or change an existing one.
 * Changing requires the current password, so a borrowed signed-in browser can't lock the owner out.
 */
export async function POST(request: Request) {
  try {
    const viewer = await getViewer();
    if (!viewer) return error("UNAUTHENTICATED", "Sign in required", 401);

    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) return error("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid password", 400);

    const user = await prisma.user.findUnique({ where: { id: viewer.id }, select: { email: true, passwordHash: true } });
    if (!user) return error("UNAUTHENTICATED", "Sign in required", 401);
    // Password sign-in is by email, so a password alone would be unusable.
    if (!user.email) return error("CONFLICT", "Add an email to your account first — send /email to the Telegram bot.", 409);

    if (user.passwordHash) {
      if (!parsed.data.currentPassword || !verifyPassword(parsed.data.currentPassword, user.passwordHash)) {
        return error("FORBIDDEN", "Your current password is incorrect.", 403);
      }
      if (verifyPassword(parsed.data.newPassword, user.passwordHash)) {
        return error("VALIDATION_ERROR", "Choose a password different from your current one.", 400);
      }
    }

    await prisma.user.update({ where: { id: viewer.id }, data: { passwordHash: hashPassword(parsed.data.newPassword) } });
    await prisma.auditEvent.create({
      data: {
        userId: viewer.id,
        action: user.passwordHash ? "PASSWORD_CHANGED" : "PASSWORD_SET",
        entityType: "User",
        entityId: viewer.id,
        metadata: {}
      }
    });

    return NextResponse.json({ ok: true, changed: Boolean(user.passwordHash) });
  } catch (err) {
    return jsonError(err);
  }
}
