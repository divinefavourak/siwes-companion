import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/admin-auth";
import { prisma } from "@/src/lib/prisma";
import { jsonError } from "@/src/lib/api";

interface Params {
  params: Promise<{ userId: string }>;
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    await requireAdmin();
    const { userId } = await params;

    // Delete both the identity and the bot state for this user
    await prisma.$transaction([
      prisma.telegramIdentity.deleteMany({ where: { userId } }),
      prisma.botConversationState.deleteMany({ where: { userId } }),
    ]);

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return jsonError(err);
  }
}
