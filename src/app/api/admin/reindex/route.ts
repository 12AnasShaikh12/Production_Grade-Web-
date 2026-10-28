import { getAdminSession } from "@/lib/auth/admin";
import { reindexNow } from "@/lib/chat/runtime";
import { getEnv } from "@/lib/config/env";
import { loadContent } from "@/lib/data/content";
import { isSameOrigin, jsonError } from "@/lib/http";
import { errorSummary, log } from "@/lib/log";

/** Re-index chatbot knowledge. Requires an authenticated admin session. */
export async function POST(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin requests are not allowed.");
  const session = await getAdminSession();
  if (!session) return jsonError(401, "Authentication required.");
  if (!getEnv().nvidia.embeddingsConfigured) return jsonError(409, "NVIDIA embeddings are not configured.");
  const { content, degraded } = await loadContent();
  if (degraded) return jsonError(503, "Content store unavailable.");
  try {
    const result = await reindexNow(content);
    return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log.error("api.reindex_failed", { error: errorSummary(error) });
    return jsonError(502, "Re-indexing failed.");
  }
}
