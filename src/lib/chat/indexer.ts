import type { SiteContent } from "@/lib/content/schemas";
import { chunkAuthoritative, corpusFingerprint, type Chunk } from "./chunking";
import { buildKnowledgeRecords } from "./knowledge";
import type { NvidiaClient } from "./nvidia";
import type { IndexedChunk, VectorStore } from "./vector-store";

export interface IndexResult {
  documents: number;
  chunks: number;
  model: string;
  fingerprint: string;
}

const BATCH_SIZE = 16;

export function authoritativeChunks(content: SiteContent): Chunk[] {
  return chunkAuthoritative(buildKnowledgeRecords(content));
}

/**
 * Re-embeds every approved, active knowledge chunk and atomically replaces the vector index.
 * Unapproved/inactive records are never embedded, and the atomic replacement guarantees that an
 * outdated version of a document cannot remain retrievable alongside the new one.
 */
export async function reindexKnowledge(content: SiteContent, nvidia: NvidiaClient, store: VectorStore): Promise<IndexResult> {
  const model = nvidia.embeddingModel;
  if (!model) throw new Error("NVIDIA_EMBEDDING_MODEL is not configured");
  const chunks = authoritativeChunks(content);
  const indexed: IndexedChunk[] = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const vectors = await nvidia.embed(
      batch.map((c) => c.content),
      "passage",
    );
    batch.forEach((c, j) => indexed.push({ ...c, embedding: vectors[j] }));
  }
  const fingerprint = corpusFingerprint(chunks);
  await store.replaceAll(indexed, model, fingerprint);
  return { documents: new Set(chunks.map((c) => c.documentId)).size, chunks: indexed.length, model, fingerprint };
}
