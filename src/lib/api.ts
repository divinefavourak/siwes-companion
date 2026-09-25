import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/src/core/shared/errors";

export function jsonError(error: unknown, requestId = crypto.randomUUID()) {
  // If it's a Next.js control flow error (thrown by redirect() or notFound()), rethrow it so Next.js handles it,
  // or return appropriate JSON statuses for APIs.
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    if (error.digest.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Authentication required" } }, { status: 401 });
    }
    if (error.digest === "NEXT_NOT_FOUND") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Admin access required" } }, { status: 403 });
    }
  }

  if (isAppError(error)) {
    const status = error.code === "NOT_FOUND" ? 404 : error.code === "FORBIDDEN" ? 403 : error.code === "CONFLICT" ? 409 : error.code === "RATE_LIMITED" ? 429 : error.code === "AI_UNAVAILABLE" ? 503 : error.code === "AI_UNSAFE_OUTPUT" ? 422 : 400;
    return NextResponse.json({ error: { code: error.code, message: error.message, requestId, details: error.details } }, { status });
  }
  return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong", requestId } }, { status: 500 });
}

export function requireValue<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) throw new AppError("NOT_FOUND", message);
  return value;
}
