import { unsupportedClaimFlags } from "@/lib/content/claims";

/** Output validation for model answers. Any failure routes the request to a deterministic fallback. */

export type AnswerRejection =
  | "empty"
  | "too_long"
  | "leak"
  | "price_mismatch"
  | "unsupported_number"
  | "unsupported_claim"
  | "completed_action";

const LEAK_PATTERNS = [
  /nvapi-[A-Za-z0-9_-]{6,}/i,
  /\b(NVIDIA_API_KEY|SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_KEY_SECRET|ADMIN_SESSION_SECRET|process\.env)\b/,
  /rzp_(live|test)_[A-Za-z0-9]+/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./,
  /<\/?(system|evidence|instructions)>/i,
  /\b(my|the) (system prompt|instructions say|hidden instructions)\b/i,
];

/** Claims of having completed actions the assistant cannot perform. */
const COMPLETED_ACTION =
  /\b(i('ve| have)|we('ve| have)) (placed|processed|issued|initiated|confirmed|cancelled|refunded|booked|created|raised|submitted)\b.{0,40}\b(order|refund|payment|ticket|purchase|return|request|cancellation)/i;

function digitsOf(amount: string): string {
  return amount.replace(/[^\d.]/g, "").replace(/\.0+$/, "");
}

function extractAmounts(text: string): string[] {
  const re = /(?:₹|\bRs\.?|\bINR)\s?(\d[\d,]*(?:\.\d+)?)/gi;
  return [...text.matchAll(re)].map((m) => digitsOf(m[1]));
}

function extractQuantities(text: string): string[] {
  const re = /\b\d+(?:\.\d+)?\s?(?:%|percent\b|mg\b|ml\b|g\b|grams?\b|days?\b|hours?\b|weeks?\b|spf\s?\d*)/gi;
  return [...text.matchAll(re)].map((m) => m[0].toLowerCase().replace(/\s+/g, ""));
}

export interface AnswerCheck {
  ok: boolean;
  reason?: AnswerRejection;
}

export function validateAnswer(answer: string, evidenceText: string, secrets: string[] = []): AnswerCheck {
  const text = answer.trim();
  if (text.length < 2) return { ok: false, reason: "empty" };
  if (text.length > 1500) return { ok: false, reason: "too_long" };
  if (LEAK_PATTERNS.some((p) => p.test(text))) return { ok: false, reason: "leak" };
  if (secrets.some((s) => s && s.length >= 8 && text.includes(s))) return { ok: false, reason: "leak" };
  if (COMPLETED_ACTION.test(text)) return { ok: false, reason: "completed_action" };

  const evidenceAmounts = new Set(extractAmounts(evidenceText));
  if (extractAmounts(text).some((a) => !evidenceAmounts.has(a))) return { ok: false, reason: "price_mismatch" };

  const evidenceQuantities = new Set(extractQuantities(evidenceText));
  if (extractQuantities(text).some((q) => !evidenceQuantities.has(q))) return { ok: false, reason: "unsupported_number" };

  if (unsupportedClaimFlags(text, evidenceText).length > 0) return { ok: false, reason: "unsupported_claim" };
  return { ok: true };
}

/** Removes markdown artefacts the chat UI does not render. */
export function tidyAnswer(answer: string): string {
  return answer
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#+\s*/gm, "")
    .replace(/\[(\d+|[a-z0-9-#]+)\]/gi, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function looksUnverified(answer: string): boolean {
  return /\b(not (currently |yet )?(been )?(confirmed|verified|published|available)|couldn't verify|could not verify|don't have (that|verified)|isn't confirmed)\b/i.test(
    answer,
  );
}
