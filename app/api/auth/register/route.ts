import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { hashPassword } from "@/src/lib/auth-crypto";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters")
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

    const existingPasswordHash = (existingUser as Record<string, unknown> | null)?.passwordHash as string | undefined;
    if (existingUser && existingPasswordHash) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    const passwordHash = hashPassword(password);

    if (existingUser) {
      await (prisma.user.update as any)({
        where: { id: existingUser.id },
        data: { name, passwordHash }
      });
    } else {
      await (prisma.user.create as any)({
        data: {
          name,
          email,
          passwordHash
        }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Sign up error:", error);
    return NextResponse.json(
      { error: "Failed to create account. Please try again." },
      { status: 500 }
    );
  }
}
