import type { SupabaseClient } from "@supabase/supabase-js";
import type { Chunk } from "./chunking";

export interface IndexedChunk extends Chunk {
  embedding: number[];
}

export interface VectorHit {
  chunkId: string;
  documentId: string;
  version: string;
  similarity: number;
}

export interface IndexStatus {
  chunkCount: number;
  model: string | null;
  fingerprint: string | null;
  indexedAt: string | null;
}

export interface VectorStore {
  readonly kind: "memory" | "supabase";
  search(embedding: number[], model: string, limit: number): Promise<VectorHit[]>;
  /** Atomically replaces the whole index so stale and current versions never coexist. */
  replaceAll(chunks: IndexedChunk[], model: string, fingerprint: string): Promise<void>;
  status(): Promise<IndexStatus>;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

/** In-process vector store for local development or deployments without pgvector. */
export class MemoryVectorStore implements VectorStore {
  readonly kind = "memory" as const;
  private chunks: IndexedChunk[] = [];
  private model: string | null = null;
  private fingerprint: string | null = null;
  private indexedAt: string | null = null;

  async search(embedding: number[], model: string, limit: number): Promise<VectorHit[]> {
    if (model !== this.model) return [];
    return this.chunks
      .filter((c) => c.approved && c.active)
      .map((c) => ({ chunkId: c.id, documentId: c.documentId, version: c.version, similarity: cosineSimilarity(embedding, c.embedding) }))
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
  }

  async replaceAll(chunks: IndexedChunk[], model: string, fingerprint: string) {
    this.chunks = chunks.filter((c) => c.approved && c.active);
    this.model = model;
    this.fingerprint = fingerprint;
    this.indexedAt = new Date().toISOString();
  }

  async status(): Promise<IndexStatus> {
    return { chunkCount: this.chunks.length, model: this.model, fingerprint: this.fingerprint, indexedAt: this.indexedAt };
  }
}

/** pgvector-backed store using the `match_knowledge_chunks` / `replace_knowledge_index` SQL functions. */
export class SupabaseVectorStore implements VectorStore {
  readonly kind = "supabase" as const;
  constructor(private readonly db: SupabaseClient) {}

  async search(embedding: number[], model: string, limit: number): Promise<VectorHit[]> {
    const { data, error } = await this.db.rpc("match_knowledge_chunks", {
      query_embedding: `[${embedding.join(",")}]`,
      p_model: model,
      match_count: limit,
    });
    if (error) throw new Error(`Vector search failed: ${error.message}`);
    return ((data ?? []) as { id: string; document_id: string; document_version: string; similarity: number }[]).map((r) => ({
      chunkId: r.id,
      documentId: r.document_id,
      version: r.document_version,
      similarity: r.similarity,
    }));
  }

  async replaceAll(chunks: IndexedChunk[], model: string, fingerprint: string) {
    const payload = chunks
      .filter((c) => c.approved && c.active)
      .map((c) => ({
        id: c.id,
        document_id: c.documentId,
        document_version: c.version,
        doc_type: c.docType,
        title: c.title,
        chunk_index: c.index,
        content: c.content,
        embedding: `[${c.embedding.join(",")}]`,
      }));
    const { error } = await this.db.rpc("replace_knowledge_index", { p_model: model, p_fingerprint: fingerprint, p_chunks: payload });
    if (error) throw new Error(`Index replacement failed: ${error.message}`);
  }

  async status(): Promise<IndexStatus> {
    const { data, error } = await this.db.from("knowledge_index_state").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(`Index status failed: ${error.message}`);
    return {
      chunkCount: (data?.chunk_count as number) ?? 0,
      model: (data?.embedding_model as string) ?? null,
      fingerprint: (data?.fingerprint as string) ?? null,
      indexedAt: (data?.indexed_at as string) ?? null,
    };
  }
}
