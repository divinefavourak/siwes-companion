import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { hashPassword, MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/src/lib/auth-crypto";
import { sendVerificationEmail } from "@/src/lib/email";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Password must be at least ${MIN_PASSWORD_LENGTH} characters`)
    .max(MAX_PASSWORD_LENGTH, "Password is too long")
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const { name, password } = result.data;
    const email = result.data.email.toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // Never attach a password to an existing row: an account without one (e.g. seeded or
    // OAuth-created) would otherwise be claimable by whoever registers its email first.
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password)
      }
    });

    // Trigger verification email dispatch via Resend
    sendVerificationEmail(email, name).catch((err) => {
      console.error("Failed to send verification email:", err);
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
