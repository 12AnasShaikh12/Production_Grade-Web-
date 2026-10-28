import type { Chunk } from "./chunking";
import { LexicalIndex } from "./lexical";
import type { VectorStore } from "./vector-store";

export interface RetrievalConfig {
  topK: number;
  minSimilarity: number;
  minLexicalScore: number;
}

export interface Evidence {
  chunk: Chunk;
  similarity: number | null;
  lexicalScore: number | null;
  fused: number;
}

export type RetrievalMethod = "hybrid" | "vector" | "lexical" | "none";

export interface RetrievalResult {
  evidence: Evidence[];
  method: RetrievalMethod;
  confident: boolean;
  /** Coarse failure label when semantic retrieval was attempted but unavailable. */
  vectorFailure?: string;
}

export interface RetrievalDeps {
  /** Current approved/active chunks from the live content — the source of truth. */
  chunks: Chunk[];
  config: RetrievalConfig;
  embedQuery?: (text: string) => Promise<number[]>;
  vectorStore?: VectorStore | null;
  embeddingModel?: string;
  /** Called before vector search, e.g. to lazily (re)build an in-memory index. */
  ensureIndex?: () => Promise<void>;
}

const RRF_K = 20;

/**
 * Hybrid retrieval: semantic (NVIDIA embeddings + vector store) fused with BM25 via reciprocal-rank
 * fusion. Vector hits are re-validated against the live chunk set so that a stale index can never
 * surface outdated, unapproved or inactive content.
 */
export async function retrieve(query: string, deps: RetrievalDeps): Promise<RetrievalResult> {
  const { chunks, config } = deps;
  const byId = new Map(chunks.map((c) => [c.id, c]));

  const lexicalHits = new LexicalIndex(chunks).search(query, config.topK);

  let vectorHits: { chunk: Chunk; similarity: number }[] = [];
  let vectorFailure: string | undefined;
  let vectorAttempted = false;
  if (deps.embedQuery && deps.vectorStore && deps.embeddingModel) {
    vectorAttempted = true;
    try {
      await deps.ensureIndex?.();
      const embedding = await deps.embedQuery(query);
      const hits = await deps.vectorStore.search(embedding, deps.embeddingModel, config.topK * 2);
      vectorHits = hits
        .map((h) => ({ hit: h, chunk: byId.get(h.chunkId) }))
        .filter((x): x is { hit: typeof x.hit; chunk: Chunk } => Boolean(x.chunk && x.chunk.version === x.hit.version))
        .filter((x) => x.hit.similarity >= config.minSimilarity)
        .slice(0, config.topK)
        .map((x) => ({ chunk: x.chunk, similarity: x.hit.similarity }));
    } catch (error) {
      vectorFailure = (error as { kind?: string })?.kind ?? "vector_unavailable";
      vectorHits = [];
    }
  }

  const strongLexical = lexicalHits.filter((h) => h.score >= config.minLexicalScore);
  const fused = new Map<string, Evidence>();
  vectorHits.forEach((h, rank) => {
    fused.set(h.chunk.id, { chunk: h.chunk, similarity: h.similarity, lexicalScore: null, fused: 1 / (RRF_K + rank + 1) });
  });
  strongLexical.forEach((h, rank) => {
    const existing = fused.get(h.chunk.id);
    const add = 1 / (RRF_K + rank + 1);
    if (existing) {
      existing.lexicalScore = h.score;
      existing.fused += add;
    } else {
      fused.set(h.chunk.id, { chunk: h.chunk, similarity: null, lexicalScore: h.score, fused: add });
    }
  });

  const evidence = [...fused.values()].sort((a, b) => b.fused - a.fused).slice(0, config.topK);
  const method: RetrievalMethod =
    vectorHits.length && strongLexical.length ? "hybrid" : vectorHits.length ? "vector" : strongLexical.length ? "lexical" : "none";

  return {
    evidence,
    method,
    confident: evidence.length > 0,
    ...(vectorAttempted && vectorFailure ? { vectorFailure } : {}),
  };
}
