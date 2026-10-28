import { getEnv } from "@/lib/config/env";
import { contactSchema } from "@/lib/contact";
import { HttpError, isSameOrigin, jsonError, readJsonBody } from "@/lib/http";
import { errorSummary, log } from "@/lib/log";
import { clientKey, RateLimiter } from "@/lib/security/rate-limit";

let limiter: RateLimiter | undefined;

export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin requests are not allowed.");
  if (!env.contact.configured) {
    return jsonError(503, "Online messages aren't available yet. Please email or call us instead.");
  }
  limiter ??= new RateLimiter(env.rateLimit.formMax, 10 * 60 * 1000);
  const limit = limiter.check(`contact:${clientKey(request.headers)}`);
  if (!limit.allowed) return jsonError(429, "Too many messages. Please try again later.", { "Retry-After": String(limit.retryAfterSeconds) });

  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    return error instanceof HttpError ? jsonError(error.status, error.publicMessage) : jsonError(400, "Invalid request.");
  }
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Please check the highlighted fields.", fieldErrors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) },
      { status: 400 },
    );
  }
  const data = parsed.data;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.contact.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: env.contact.fromEmail,
        to: [env.contact.toEmail],
        reply_to: data.email,
        subject: `Website enquiry from ${data.name}`,
        text: `Name: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || "—"}\n\n${data.message}`,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Email provider responded ${res.status}`);
  } catch (error) {
    log.error("contact.delivery_failed", { error: errorSummary(error) });
    return jsonError(502, "We couldn't send your message right now. Please email or call us instead.");
  }
  log.info("contact.delivered");
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
