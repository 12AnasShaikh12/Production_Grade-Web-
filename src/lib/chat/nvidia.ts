import { z } from "zod";

/**
 * Minimal NVIDIA API client (OpenAI-compatible `/chat/completions` and `/embeddings`).
 * Server-only: the API key is read from server configuration and never leaves the server.
 */

export type NvidiaErrorKind =
  | "not_configured"
  | "auth"
  | "rate_limited"
  | "server"
  | "network"
  | "timeout"
  | "model_unavailable"
  | "bad_request"
  | "bad_response";

export class NvidiaError extends Error {
  constructor(
    readonly kind: NvidiaErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "NvidiaError";
  }
  get retryable(): boolean {
    return this.kind === "rate_limited" || this.kind === "server" || this.kind === "network" || this.kind === "timeout";
  }
}

export interface NvidiaConfig {
  apiKey?: string;
  baseUrl: string;
  chatModel?: string;
  embeddingModel?: string;
  embeddingInputType: "query_passage" | "none";
  timeoutMs: number;
  maxRetries: number;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface NvidiaClient {
  readonly chatModel?: string;
  readonly embeddingModel?: string;
  chat(messages: ChatMessage[], options?: { maxTokens?: number; temperature?: number }): Promise<string>;
  embed(texts: string[], inputType: "query" | "passage"): Promise<number[][]>;
  listModels(): Promise<string[]>;
}

const chatResponseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable().optional() }).passthrough(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .min(1),
});

const embeddingResponseSchema = z.object({
  data: z.array(z.object({ index: z.number().int(), embedding: z.array(z.number()) })).min(1),
});

const modelsResponseSchema = z.object({ data: z.array(z.object({ id: z.string() })) });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function classifyStatus(status: number, bodySnippet: string): NvidiaError {
  if (status === 401 || status === 403) return new NvidiaError("auth", `NVIDIA rejected the credentials (HTTP ${status})`, status);
  if (status === 429) return new NvidiaError("rate_limited", "NVIDIA rate limit reached (HTTP 429)", status);
  if (status === 404 || /model.*(not found|does not exist|unknown)|unknown model/i.test(bodySnippet))
    return new NvidiaError("model_unavailable", `NVIDIA model or endpoint unavailable (HTTP ${status})`, status);
  if (status >= 500) return new NvidiaError("server", `NVIDIA server error (HTTP ${status})`, status);
  return new NvidiaError("bad_request", `NVIDIA rejected the request (HTTP ${status})`, status);
}

export function createNvidiaClient(config: NvidiaConfig, fetchImpl: typeof fetch = fetch): NvidiaClient {
  async function request(path: string, init: { method: "GET" | "POST"; body?: unknown }): Promise<unknown> {
    if (!config.apiKey) throw new NvidiaError("not_configured", "NVIDIA_API_KEY is not set");
    let attempt = 0;
    for (;;) {
      try {
        let response: Response;
        try {
          response = await fetchImpl(`${config.baseUrl}${path}`, {
            method: init.method,
            headers: {
              Authorization: `Bearer ${config.apiKey}`,
              Accept: "application/json",
              ...(init.body ? { "Content-Type": "application/json" } : {}),
            },
            body: init.body ? JSON.stringify(init.body) : undefined,
            signal: AbortSignal.timeout(config.timeoutMs),
            cache: "no-store",
          });
        } catch (error) {
          const name = (error as Error)?.name;
          if (name === "TimeoutError" || name === "AbortError") throw new NvidiaError("timeout", `NVIDIA request timed out after ${config.timeoutMs}ms`);
          throw new NvidiaError("network", "Could not reach the NVIDIA API");
        }
        if (!response.ok) {
          const snippet = (await response.text().catch(() => "")).slice(0, 300);
          const err = classifyStatus(response.status, snippet);
          if (err.kind === "rate_limited") {
            const retryAfter = Number(response.headers.get("retry-after"));
            if (Number.isFinite(retryAfter) && retryAfter > 0) (err as NvidiaError & { retryAfterMs?: number }).retryAfterMs = retryAfter * 1000;
          }
          throw err;
        }
        try {
          return await response.json();
        } catch {
          throw new NvidiaError("bad_response", "NVIDIA returned a non-JSON response");
        }
      } catch (error) {
        const err = error instanceof NvidiaError ? error : new NvidiaError("network", "Unexpected NVIDIA client failure");
        if (!err.retryable || attempt >= config.maxRetries) throw err;
        attempt++;
        const hinted = (err as NvidiaError & { retryAfterMs?: number }).retryAfterMs;
        await sleep(Math.min(2000, hinted ?? 250 * 2 ** attempt));
      }
    }
  }

  return {
    chatModel: config.chatModel,
    embeddingModel: config.embeddingModel,

    async chat(messages, options = {}) {
      if (!config.chatModel) throw new NvidiaError("not_configured", "NVIDIA_CHAT_MODEL is not set");
      const json = await request("/chat/completions", {
        method: "POST",
        body: {
          model: config.chatModel,
          messages,
          temperature: options.temperature ?? 0.2,
          top_p: 0.7,
          max_tokens: options.maxTokens ?? 400,
          stream: false,
        },
      });
      const parsed = chatResponseSchema.safeParse(json);
      if (!parsed.success) throw new NvidiaError("bad_response", "Unexpected chat completion shape");
      const content = parsed.data.choices[0].message.content?.trim() ?? "";
      if (!content) throw new NvidiaError("bad_response", "Empty chat completion");
      return content;
    },

    async embed(texts, inputType) {
      if (!config.embeddingModel) throw new NvidiaError("not_configured", "NVIDIA_EMBEDDING_MODEL is not set");
      if (texts.length === 0) return [];
      const json = await request("/embeddings", {
        method: "POST",
        body: {
          model: config.embeddingModel,
          input: texts,
          encoding_format: "float",
          ...(config.embeddingInputType === "query_passage" ? { input_type: inputType, truncate: "END" } : {}),
        },
      });
      const parsed = embeddingResponseSchema.safeParse(json);
      if (!parsed.success || parsed.data.data.length !== texts.length)
        throw new NvidiaError("bad_response", "Unexpected embeddings response shape");
      const vectors = [...parsed.data.data].sort((a, b) => a.index - b.index).map((d) => d.embedding);
      const dims = vectors[0].length;
      if (dims === 0 || vectors.some((v) => v.length !== dims || v.some((x) => !Number.isFinite(x))))
        throw new NvidiaError("bad_response", "Malformed embedding vectors");
      return vectors;
    },

    async listModels() {
      const json = await request("/models", { method: "GET" });
      const parsed = modelsResponseSchema.safeParse(json);
      if (!parsed.success) throw new NvidiaError("bad_response", "Unexpected models response shape");
      return parsed.data.data.map((m) => m.id);
    },
  };
}
