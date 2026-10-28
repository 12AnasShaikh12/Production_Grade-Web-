/** Shared helpers for JSON route handlers: size-limited body parsing and safe error responses. */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly publicMessage: string,
  ) {
    super(publicMessage);
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().includes("application/json")) throw new HttpError(415, "Expected a JSON request.");
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw new HttpError(413, "Request is too large.");
  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBytes) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Malformed JSON.");
  }
}

export function jsonError(status: number, message: string, extraHeaders: Record<string, string> = {}): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...extraHeaders } });
}

/** Rejects cross-site POSTs from browsers (defence in depth on top of SameSite cookies). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Non-browser clients (curl, server-to-server) don't send Origin.
  try {
    return new URL(origin).host === new URL(request.url).host || origin === process.env.NEXT_PUBLIC_SITE_URL;
  } catch {
    return false;
  }
}
