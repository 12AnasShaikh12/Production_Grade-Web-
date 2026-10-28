/**
 * Structured, redacting logger. Never pass secrets or full customer data; anything that looks like
 * a credential is masked defensively anyway.
 */

const SECRET_PATTERNS = [
  /nvapi-[A-Za-z0-9_-]{8,}/g,
  /rzp_(live|test)_[A-Za-z0-9]{6,}/g,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /(Bearer|Basic)\s+[A-Za-z0-9+/=._-]{8,}/gi,
  /re_[A-Za-z0-9]{16,}/g,
];

export function redact(value: string): string {
  return SECRET_PATTERNS.reduce((s, p) => s.replace(p, "[redacted]"), value);
}

type Level = "info" | "warn" | "error";

function emit(level: Level, event: string, data?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "test" && !process.env.DEBUG_LOGS) return;
  const line = redact(JSON.stringify({ level, event, ...data, at: new Date().toISOString() }));
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => emit("info", event, data),
  warn: (event: string, data?: Record<string, unknown>) => emit("warn", event, data),
  error: (event: string, data?: Record<string, unknown>) => emit("error", event, data),
};

export function errorSummary(error: unknown): string {
  if (error instanceof Error) return redact(`${error.name}: ${error.message}`).slice(0, 300);
  return "Unknown error";
}
