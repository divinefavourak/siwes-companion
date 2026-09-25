import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { sendVerificationEmail } from "@/src/lib/email";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { name: true, emailVerified: true },
    });

    if (!user) {
      // Don't disclose whether an email exists or not
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "Email is already verified" }, { status: 400 });
    }

    await sendVerificationEmail(cleanEmail, user.name);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Failed to send verification email" }, { status: 500 });
  }
}
