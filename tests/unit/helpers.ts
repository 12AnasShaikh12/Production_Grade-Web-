import { vi } from "vitest";
import { tokenize } from "@/lib/chat/lexical";
import type { ChatMessage, NvidiaClient } from "@/lib/chat/nvidia";
import type { ChatDeps } from "@/lib/chat/service";
import type { SiteContent } from "@/lib/content/schemas";
import { getSeedContent } from "@/lib/content/seed";

/** Deterministic bag-of-words hashing embedding — semantic enough for retrieval tests. */
export function hashEmbed(text: string, dims = 128): number[] {
  const v = new Array(dims).fill(0);
  for (const token of tokenize(text)) {
    let h = 2166136261;
    for (const ch of token) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    v[Math.abs(h) % dims] += 1;
  }
  return v;
}

export function fakeNvidia(
  options: {
    chat?: (messages: ChatMessage[]) => Promise<string> | string;
    embed?: (texts: string[]) => Promise<number[][]> | number[][];
    embeddingModel?: string | undefined;
  } = {},
): NvidiaClient & { chat: ReturnType<typeof vi.fn>; embed: ReturnType<typeof vi.fn> } {
  const chat = vi.fn(async (messages: ChatMessage[]) => (options.chat ? options.chat(messages) : "OK"));
  const embed = vi.fn(async (texts: string[]) => (options.embed ? options.embed(texts) : texts.map((t) => hashEmbed(t))));
  return {
    chatModel: "test/chat",
    embeddingModel: "embeddingModel" in options ? options.embeddingModel : "test/embed",
    chat,
    embed,
    listModels: async () => ["test/chat", "test/embed"],
  } as never;
}

export const testRetrieval = { topK: 6, minSimilarity: 0.15, minLexicalScore: 2 };

export function depsFor(content: SiteContent, overrides: Partial<ChatDeps> = {}): ChatDeps {
  return {
    loadContent: async () => ({ content, source: "seed", degraded: false }),
    nvidia: null,
    vectorStore: null,
    retrievalConfig: testRetrieval,
    ...overrides,
  };
}

export function seed(): SiteContent {
  return getSeedContent();
}

/** The final user message sent to the model (contains the evidence block). */
export function lastUserContent(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}
