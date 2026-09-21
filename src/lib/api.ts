import { NextResponse } from "next/server";
import { AppError, isAppError } from "@/src/core/shared/errors";

export function jsonError(error: unknown, requestId = crypto.randomUUID()) {
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
