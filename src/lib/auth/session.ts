import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed session tokens for the development-only local admin login.
 * Format: base64url(payload).base64url(HMAC-SHA256(payload, secret)).
 */

export interface LocalSessionPayload {
  sub: "local-admin";
  exp: number;
}

export const LOCAL_SESSION_COOKIE = "amros_admin";
export const LOCAL_SESSION_TTL_SECONDS = 8 * 60 * 60;

function sign(data: string, secret: string) {
  return createHmac("sha256", secret).update(data).digest("base64url");
}

export function createLocalSession(secret: string, now = Date.now()): string {
  const payload: LocalSessionPayload = { sub: "local-admin", exp: Math.floor(now / 1000) + LOCAL_SESSION_TTL_SECONDS };
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${data}.${sign(data, secret)}`;
}

export function verifyLocalSession(token: string | undefined, secret: string | undefined, now = Date.now()): LocalSessionPayload | null {
  if (!token || !secret) return null;
  const [data, mac] = token.split(".");
  if (!data || !mac) return null;
  const expected = Buffer.from(sign(data, secret));
  const received = Buffer.from(mac);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as LocalSessionPayload;
    if (payload.sub !== "local-admin" || typeof payload.exp !== "number" || payload.exp * 1000 < now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Constant-time password comparison (hash both sides to equalise length). */
export function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
