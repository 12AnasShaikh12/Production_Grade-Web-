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
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.host === requestUrl.host) return true;

    // Loopback aliases should be treated as the same origin: `localhost`, `127.0.0.1` and the
    // IPv6 loopback `[::1]` are all "this machine" during local development. Matching only on
    // host string would otherwise falsely reject a browser on 127.0.0.1 reaching a server that
    // reports its host as localhost (or vice versa) — a common dev gotcha on Windows where the
    // forwarded port and the hostname don't line up.
    const loopbacks = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);
    if (originUrl.port === requestUrl.port && loopbacks.has(originUrl.hostname) && loopbacks.has(requestUrl.hostname)) return true;

    // Behind a reverse proxy (Render, and most other PaaS hosts), `request.url` reflects the
    // host the proxy forwards to internally, not the public hostname the browser connected to.
    // The proxy records that public hostname in `X-Forwarded-Host` (or `Forwarded: host=`), so
    // trust it the same way the platform's own routing does — this is what actually keeps the
    // check working without requiring NEXT_PUBLIC_SITE_URL to be perfectly in sync.
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    if (forwardedHost && forwardedHost === originUrl.host) return true;

    // Fall back to the configured public site URL (preview/production deployments behind a
    // proxy, where `request.url` can show the upstream host rather than the public one).
    const configured = process.env.NEXT_PUBLIC_SITE_URL;
    if (configured) {
      try {
        if (new URL(configured).host === originUrl.host) return true;
      } catch {
        /* ignore malformed env */
      }
    }

    return false;
  } catch {
    return false;
  }
}
