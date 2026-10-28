import { z } from "zod";
import type { FallbackIntent } from "@/lib/content/schemas";
import type { LoadedContent } from "@/lib/data/content";
import { errorSummary, log } from "@/lib/log";
import { authoritativeChunks } from "./indexer";
import { fallbackAnswer } from "./fallbacks";
import { looksUnverified, tidyAnswer, validateAnswer, type AnswerRejection } from "./guard";
import { classifyIntent, isInjectionAttempt } from "./intents";
import type { NvidiaClient } from "./nvidia";
import { buildMessages } from "./prompt";
import { retrieve, type RetrievalConfig, type RetrievalMethod } from "./retrieval";
import type { VectorStore } from "./vector-store";

export const MAX_HISTORY = 10;

export function chatRequestSchema(maxChars: number) {
  return z
    .object({
      message: z.string().trim().min(1, "Please type a question.").max(maxChars, `Please keep questions under ${maxChars} characters.`),
      history: z
        .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
        .max(MAX_HISTORY * 2)
        .optional()
        .default([]),
    })
    .strict();
}

export type ChatRequest = z.infer<ReturnType<typeof chatRequestSchema>>;

export type FallbackReason =
  | "ai_not_configured"
  | "low_confidence"
  | "guard_refusal"
  | "medical_safety"
  | "greeting"
  | `ai_${string}`
  | `rejected_${AnswerRejection}`;

export interface ChatResult {
  answer: string;
  mode: "ai" | "fallback";
  intent: FallbackIntent;
  unverified: boolean;
  /** Internal verification metadata (ids/titles of public knowledge records only). */
  sources: { id: string; title: string }[];
  retrieval: RetrievalMethod | "skipped";
  fallbackReason?: FallbackReason;
}

export interface ChatDeps {
  loadContent: () => Promise<LoadedContent>;
  nvidia: NvidiaClient | null;
  vectorStore: VectorStore | null;
  retrievalConfig: RetrievalConfig;
  /** Lazily builds/refreshes an index when the store supports it (in-memory store). */
  ensureIndex?: (content: LoadedContent["content"]) => Promise<void>;
  /** Secret values that must never appear in an answer. */
  secrets?: string[];
}

/**
 * Answers a visitor's question. Deterministic fallbacks are used whenever the AI path is not
 * configured, fails, retrieves weak evidence, or produces an answer that fails validation.
 */
export async function answerChat(request: ChatRequest, deps: ChatDeps): Promise<ChatResult> {
  const { content } = await deps.loadContent();
  const question = request.message;
  const intent = classifyIntent(question);

  const fallback = (reason: FallbackReason, retrieval: ChatResult["retrieval"] = "skipped", sources: ChatResult["sources"] = []): ChatResult => {
    const fb = fallbackAnswer(content, intent, question);
    return { answer: fb.answer, mode: "fallback", intent: fb.intent, unverified: fb.unverified, sources, retrieval, fallbackReason: reason };
  };

  // Safety routing happens before any model call.
  if (intent === "refusal") return fallback("guard_refusal");
  if (intent === "medical") return fallback("medical_safety");
  if (intent === "greeting") return fallback("greeting");
  // Identity / meta questions always answer with the deterministic scope statement — the LLM
  // must never be allowed to improvise about what it "is" or who built it.
  if (intent === "identity") return fallback("guard_refusal");

  if (!deps.nvidia || !deps.nvidia.chatModel) return fallback("ai_not_configured");

  const chunks = authoritativeChunks(content);
  const nvidia = deps.nvidia;
  const canEmbed = Boolean(nvidia.embeddingModel && deps.vectorStore);
  const result = await retrieve(question, {
    chunks,
    config: deps.retrievalConfig,
    vectorStore: deps.vectorStore,
    embeddingModel: nvidia.embeddingModel,
    embedQuery: canEmbed ? async (text) => (await nvidia.embed([text], "query"))[0] : undefined,
    ensureIndex: deps.ensureIndex ? () => deps.ensureIndex!(content) : undefined,
  });
  if (result.vectorFailure) log.warn("chat.vector_unavailable", { kind: result.vectorFailure });

  const sources = result.evidence.map((e) => ({ id: e.chunk.documentId, title: e.chunk.title }));
  if (!result.confident) return fallback("low_confidence", result.method);

  const history = request.history.filter((m) => !isInjectionAttempt(m.content));
  const messages = buildMessages(
    { brandName: content.brand.name, email: content.brand.email, phone: content.brand.phoneDisplay },
    question,
    result.evidence,
    history,
  );

  let raw: string;
  try {
    raw = await nvidia.chat(messages, { maxTokens: 400, temperature: 0.2 });
  } catch (error) {
    const kind = (error as { kind?: string })?.kind ?? "error";
    log.warn("chat.model_failed", { kind, error: errorSummary(error) });
    return fallback(`ai_${kind}`, result.method, sources);
  }

  const answer = tidyAnswer(raw);
  const evidenceText = result.evidence.map((e) => e.chunk.content).join("\n");
  const check = validateAnswer(answer, evidenceText, deps.secrets);
  if (!check.ok) {
    log.warn("chat.answer_rejected", { reason: check.reason });
    return fallback(`rejected_${check.reason!}`, result.method, sources);
  }

  return { answer, mode: "ai", intent, unverified: looksUnverified(answer), sources, retrieval: result.method };
}
