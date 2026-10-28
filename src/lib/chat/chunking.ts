import { createHash } from "node:crypto";
import type { KnowledgeDocType } from "@/lib/content/schemas";
import { isAuthoritative, type KnowledgeRecord } from "./knowledge";

export interface Chunk {
  /** Stable id: `${documentId}#${index}`. */
  id: string;
  documentId: string;
  /** Hash of the document content + flags. A chunk is only valid while its version is current. */
  version: string;
  docType: KnowledgeDocType;
  title: string;
  index: number;
  content: string;
  approved: boolean;
  active: boolean;
}

export interface ChunkOptions {
  maxChars?: number;
  overlapChars?: number;
}

export function documentVersion(record: KnowledgeRecord): string {
  return createHash("sha256")
    .update(`${record.title}\n${record.content}\n${record.approved}\n${record.active}`)
    .digest("hex")
    .slice(0, 16);
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Paragraph-aware chunking with sentence-level overlap. Each chunk is prefixed with the document
 * title so it remains meaningful on its own for both embedding and lexical matching.
 */
export function chunkRecord(record: KnowledgeRecord, options: ChunkOptions = {}): Chunk[] {
  const maxChars = options.maxChars ?? 700;
  const overlapChars = options.overlapChars ?? 120;
  const version = documentVersion(record);
  const sentences = record.content
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitSentences(paragraph.replace(/\s+/g, " ")));

  const bodies: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    const pieces = sentence.length > maxChars ? sentence.match(new RegExp(`.{1,${maxChars}}(\\s|$)`, "g")) ?? [sentence] : [sentence];
    for (const piece of pieces) {
      if (length + piece.length > maxChars && current.length) {
        bodies.push(current.join(" "));
        // Carry trailing sentences forward as overlap.
        const overlap: string[] = [];
        let overlapLength = 0;
        for (let i = current.length - 1; i >= 0 && overlapLength + current[i].length <= overlapChars; i--) {
          overlap.unshift(current[i]);
          overlapLength += current[i].length;
        }
        current = overlap;
        length = overlapLength;
      }
      current.push(piece.trim());
      length += piece.length + 1;
    }
  }
  if (current.length) bodies.push(current.join(" "));

  return bodies.map((body, index) => ({
    id: `${record.id}#${index}`,
    documentId: record.id,
    version,
    docType: record.docType,
    title: record.title,
    index,
    content: `${record.title}. ${body}`,
    approved: record.approved,
    active: record.active,
  }));
}

/** Only approved + active records are ever turned into retrievable chunks. */
export function chunkAuthoritative(records: KnowledgeRecord[], options?: ChunkOptions): Chunk[] {
  return records.filter(isAuthoritative).flatMap((r) => chunkRecord(r, options));
}

export function corpusFingerprint(chunks: Chunk[]): string {
  return createHash("sha256")
    .update(chunks.map((c) => `${c.id}:${c.version}`).join("|"))
    .digest("hex")
    .slice(0, 16);
}
