import { z } from "zod";

/**
 * Server-side configuration. Missing optional integrations never throw: each feature exposes a
 * `configured` flag and degrades gracefully. Secret values are only ever read here and are never
 * logged or returned to the browser.
 */

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === "" ? fallback : ["1", "true", "yes", "on"].includes(v.toLowerCase())));

const num = (fallback: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v) => {
      const n = v === undefined || v === "" ? fallback : Number(v);
      return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    });

const str = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const envSchema = z.object({
  NODE_ENV: z.string().optional(),
  APP_ENV: z.enum(["development", "preview", "production", "test"]).optional(),
  NEXT_PUBLIC_SITE_URL: str,

  NVIDIA_API_KEY: str,
  NVIDIA_BASE_URL: str,
  NVIDIA_CHAT_MODEL: str,
  NVIDIA_EMBEDDING_MODEL: str,
  NVIDIA_EMBEDDING_INPUT_TYPE: z.enum(["query_passage", "none"]).optional(),
  NVIDIA_TIMEOUT_MS: num(15000, 1000, 60000),
  NVIDIA_MAX_RETRIES: num(1, 0, 3),

  RAG_MIN_SIMILARITY: num(0.32, 0, 1),
  RAG_MIN_LEXICAL_SCORE: num(2, 0, 50),
  RAG_TOP_K: num(6, 1, 20),

  SUPABASE_URL: str,
  SUPABASE_ANON_KEY: str,
  SUPABASE_SERVICE_ROLE_KEY: str,

  ADMIN_EMAILS: str,
  ADMIN_LOCAL_PASSWORD: str,
  ADMIN_SESSION_SECRET: str,

  LOCAL_CONTENT_STORE: z.enum(["auto", "enabled", "disabled"]).optional(),
  LOCAL_CONTENT_PATH: str,

  RAZORPAY_KEY_ID: str,
  RAZORPAY_KEY_SECRET: str,
  RAZORPAY_WEBHOOK_SECRET: str,
  CHECKOUT_LIVE_PAYMENTS: bool(false),

  CHAT_RATE_LIMIT_MAX: num(20, 1, 1000),
  CHAT_RATE_LIMIT_WINDOW_SECONDS: num(60, 1, 86400),
  CHAT_MAX_MESSAGE_CHARS: num(500, 50, 4000),
  FORM_RATE_LIMIT_MAX: num(5, 1, 100),

  RESEND_API_KEY: str,
  CONTACT_FROM_EMAIL: str,
  CONTACT_TO_EMAIL: str,
});

export type ServerEnv = ReturnType<typeof readEnv>;

function readEnv(source: NodeJS.ProcessEnv = process.env) {
  const e = envSchema.parse(source);
  const isProduction = (e.APP_ENV ?? (e.NODE_ENV === "production" ? "production" : "development")) === "production";

  const adminSecretOk = Boolean(e.ADMIN_SESSION_SECRET && e.ADMIN_SESSION_SECRET.length >= 32);
  const localStoreMode = e.LOCAL_CONTENT_STORE ?? "auto";

  return {
    isProduction,
    siteUrl: (e.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),

    nvidia: {
      apiKey: e.NVIDIA_API_KEY,
      baseUrl: (e.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1").replace(/\/+$/, ""),
      chatModel: e.NVIDIA_CHAT_MODEL,
      embeddingModel: e.NVIDIA_EMBEDDING_MODEL,
      embeddingInputType: e.NVIDIA_EMBEDDING_INPUT_TYPE ?? "query_passage",
      timeoutMs: e.NVIDIA_TIMEOUT_MS,
      maxRetries: e.NVIDIA_MAX_RETRIES,
      chatConfigured: Boolean(e.NVIDIA_API_KEY && e.NVIDIA_CHAT_MODEL),
      embeddingsConfigured: Boolean(e.NVIDIA_API_KEY && e.NVIDIA_EMBEDDING_MODEL),
    },

    rag: {
      minSimilarity: e.RAG_MIN_SIMILARITY,
      minLexicalScore: e.RAG_MIN_LEXICAL_SCORE,
      topK: e.RAG_TOP_K,
    },

    supabase: {
      url: e.SUPABASE_URL,
      anonKey: e.SUPABASE_ANON_KEY,
      serviceRoleKey: e.SUPABASE_SERVICE_ROLE_KEY,
      configured: Boolean(e.SUPABASE_URL && e.SUPABASE_SERVICE_ROLE_KEY),
      authConfigured: Boolean(e.SUPABASE_URL && e.SUPABASE_ANON_KEY && e.SUPABASE_SERVICE_ROLE_KEY),
    },

    admin: {
      emails: (e.ADMIN_EMAILS ?? "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
      localPassword: e.ADMIN_LOCAL_PASSWORD,
      sessionSecret: adminSecretOk ? e.ADMIN_SESSION_SECRET : undefined,
      /** Password login is a development convenience; production requires Supabase Auth. */
      localLoginEnabled: Boolean(e.ADMIN_LOCAL_PASSWORD && adminSecretOk && !isProduction),
    },

    localStore: {
      enabled: localStoreMode === "enabled" || (localStoreMode === "auto" && !isProduction),
      path: e.LOCAL_CONTENT_PATH ?? ".data/content.json",
    },

    razorpay: {
      keyId: e.RAZORPAY_KEY_ID,
      keySecret: e.RAZORPAY_KEY_SECRET,
      webhookSecret: e.RAZORPAY_WEBHOOK_SECRET,
      configured: Boolean(e.RAZORPAY_KEY_ID && e.RAZORPAY_KEY_SECRET),
      webhookConfigured: Boolean(e.RAZORPAY_WEBHOOK_SECRET),
      livePaymentsFlag: e.CHECKOUT_LIVE_PAYMENTS,
    },

    rateLimit: {
      chatMax: e.CHAT_RATE_LIMIT_MAX,
      chatWindowMs: e.CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000,
      formMax: e.FORM_RATE_LIMIT_MAX,
    },

    chat: {
      maxMessageChars: e.CHAT_MAX_MESSAGE_CHARS,
    },

    contact: {
      resendApiKey: e.RESEND_API_KEY,
      fromEmail: e.CONTACT_FROM_EMAIL,
      toEmail: e.CONTACT_TO_EMAIL,
      configured: Boolean(e.RESEND_API_KEY && e.CONTACT_FROM_EMAIL && e.CONTACT_TO_EMAIL),
    },
  };
}

let cached: ServerEnv | undefined;

export function getEnv(): ServerEnv {
  if (!cached) cached = readEnv();
  return cached;
}

/** Test hook: rebuild configuration from a supplied environment. */
export function setEnvForTesting(source: NodeJS.ProcessEnv | undefined): void {
  cached = source ? readEnv(source) : undefined;
}

export function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
}
