import "server-only";
import { getEnv } from "@/lib/config/env";
import type { SiteContent } from "@/lib/content/schemas";
import { loadContent } from "@/lib/data/content";
import { errorSummary, log } from "@/lib/log";
import { getServiceClient } from "@/lib/supabase/service";
import { corpusFingerprint } from "./chunking";
import { authoritativeChunks, reindexKnowledge, type IndexResult } from "./indexer";
import { createNvidiaClient, type NvidiaClient } from "./nvidia";
import type { ChatDeps } from "./service";
import { MemoryVectorStore, SupabaseVectorStore, type VectorStore } from "./vector-store";

let memoryStore: MemoryVectorStore | undefined;
let inflight: Promise<void> | undefined;
let lastFailureAt = 0;
const FAILURE_COOLDOWN_MS = 60_000;

export function getNvidiaClient(): NvidiaClient | null {
  const { nvidia } = getEnv();
  if (!nvidia.apiKey) return null;
  return createNvidiaClient({
    apiKey: nvidia.apiKey,
    baseUrl: nvidia.baseUrl,
    chatModel: nvidia.chatModel,
    embeddingModel: nvidia.embeddingModel,
    embeddingInputType: nvidia.embeddingInputType,
    timeoutMs: nvidia.timeoutMs,
    maxRetries: nvidia.maxRetries,
  });
}

export function getVectorStore(): VectorStore {
  const db = getServiceClient();
  if (db) return new SupabaseVectorStore(db);
  memoryStore ??= new MemoryVectorStore();
  return memoryStore;
}

/** Re-indexes now (admin action / CLI). Throws on failure so callers can report it honestly. */
export async function reindexNow(content: SiteContent): Promise<IndexResult> {
  const nvidia = getNvidiaClient();
  if (!nvidia?.embeddingModel) throw new Error("NVIDIA embeddings are not configured (NVIDIA_API_KEY and NVIDIA_EMBEDDING_MODEL).");
  return reindexKnowledge(content, nvidia, getVectorStore());
}

/**
 * Keeps the vector index in step with content: if the stored fingerprint differs from the live
 * content's fingerprint, re-index once (deduplicated, with a cool-down after failures).
 */
async function ensureIndex(content: SiteContent): Promise<void> {
  const store = getVectorStore();
  const fingerprint = corpusFingerprint(authoritativeChunks(content));
  const status = await store.status();
  if (status.fingerprint === fingerprint && status.model === getEnv().nvidia.embeddingModel) return;
  if (Date.now() - lastFailureAt < FAILURE_COOLDOWN_MS) return;
  inflight ??= reindexNow(content)
    .then((r) => log.info("rag.reindexed", { chunks: r.chunks, store: store.kind }))
    .catch((error) => {
      lastFailureAt = Date.now();
      log.warn("rag.reindex_failed", { error: errorSummary(error) });
    })
    .finally(() => {
      inflight = undefined;
    });
  await inflight;
}

export function getChatDeps(): ChatDeps {
  const env = getEnv();
  const nvidia = getNvidiaClient();
  return {
    loadContent,
    nvidia: env.nvidia.chatConfigured ? nvidia : null,
    vectorStore: env.nvidia.embeddingsConfigured ? getVectorStore() : null,
    retrievalConfig: env.rag,
    ensureIndex: env.nvidia.embeddingsConfigured ? ensureIndex : undefined,
    secrets: [env.nvidia.apiKey, env.supabase.serviceRoleKey, env.razorpay.keySecret, env.admin.sessionSecret].filter(
      (s): s is string => Boolean(s),
    ),
  };
}
