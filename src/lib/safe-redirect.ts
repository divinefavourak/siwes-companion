/**
 * Returns `value` only if it is a path on this site ("/settings", "/telegram/confirm?token=…").
 * Rejects absolute URLs and protocol-relative tricks ("//evil.example", "/\evil.example") so a
 * crafted sign-in link can't send someone to another site after they sign in.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
