import { getEnv } from "@/lib/config/env";
import { getChatDeps } from "@/lib/chat/runtime";
import { answerChat, chatRequestSchema } from "@/lib/chat/service";
import { fallbackAnswer } from "@/lib/chat/fallbacks";
import { getSeedContent } from "@/lib/content/seed";
import { HttpError, isSameOrigin, jsonError, readJsonBody } from "@/lib/http";
import { errorSummary, log } from "@/lib/log";
import { clientKey, RateLimiter } from "@/lib/security/rate-limit";

const MAX_BODY_BYTES = 16 * 1024;

let limiter: RateLimiter | undefined;
function getLimiter() {
  const { rateLimit } = getEnv();
  limiter ??= new RateLimiter(rateLimit.chatMax, rateLimit.chatWindowMs);
  return limiter;
}

export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin requests are not allowed.");

  const limit = getLimiter().check(`chat:${clientKey(request.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, "You're sending messages quickly. Please wait a moment and try again.", {
      "Retry-After": String(limit.retryAfterSeconds),
    });
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof HttpError) return jsonError(error.status, error.publicMessage);
    return jsonError(400, "Invalid request.");
  }

  const parsed = chatRequestSchema(getEnv().chat.maxMessageChars).safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  try {
    const result = await answerChat(parsed.data, getChatDeps());
    log.info("chat.answered", { mode: result.mode, intent: result.intent, retrieval: result.retrieval, reason: result.fallbackReason });
    return Response.json(
      { answer: result.answer, mode: result.mode, unverified: result.unverified, sources: result.sources },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Last line of defence: never surface internals; answer deterministically from bundled facts.
    log.error("chat.unhandled", { error: errorSummary(error) });
    const fb = fallbackAnswer(getSeedContent(), "unknown");
    return Response.json({ answer: fb.answer, mode: "fallback", unverified: true, sources: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
