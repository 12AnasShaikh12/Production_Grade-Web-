import { ZodError } from "zod";
import { findClaimFlags, type ClaimFlag } from "@/lib/content/claims";
import type { SiteContent } from "@/lib/content/schemas";
import type { ContentMutation } from "@/lib/data/mutations";
import type { ContentRepository } from "@/lib/data/repositories";
import type { IndexResult } from "@/lib/chat/indexer";
import { errorSummary, log } from "@/lib/log";

export interface ActionState {
  ok: boolean;
  message: string;
  warnings?: string[];
  claimFlags?: ClaimFlag[];
  needsClaimConfirmation?: boolean;
}

export const initialActionState: ActionState = { ok: false, message: "" };

export interface SaveDeps {
  session: { email: string } | null;
  repo: ContentRepository;
  /** Expires cached storefront content (updateTag in a Server Action). */
  invalidate: () => void;
  /** Re-indexes chatbot knowledge; omitted when embeddings are not configured. */
  reindex?: (content: SiteContent) => Promise<IndexResult>;
}

export function zodMessage(error: ZodError): string {
  const issue = error.issues[0];
  const path = issue?.path.join(".");
  return issue ? `${path ? `${path}: ` : ""}${issue.message}` : "Invalid input.";
}

/**
 * The single path for every admin content change:
 *  1. authorise  2. gate unsubstantiated claims  3. validate + persist  4. invalidate caches
 *  5. re-index chatbot knowledge — and report success only for steps that actually succeeded.
 */
export async function saveContent(
  deps: SaveDeps,
  mutation: ContentMutation,
  options: { claimTexts?: string[]; confirmClaims?: boolean } = {},
): Promise<ActionState> {
  if (!deps.session) return { ok: false, message: "You are not authorised to make this change. Please sign in again." };
  if (!deps.repo.writable) {
    return { ok: false, message: "Content storage is read-only in this environment. Configure Supabase to edit content in production." };
  }

  const flags = findClaimFlags((options.claimTexts ?? []).join("\n"));
  if (flags.length > 0 && !options.confirmClaims) {
    return {
      ok: false,
      needsClaimConfirmation: true,
      claimFlags: flags,
      message: "This copy contains wording that may need substantiation. Review the flagged phrases, then confirm to publish.",
    };
  }

  let content: SiteContent;
  try {
    content = await deps.repo.mutate(mutation);
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, message: zodMessage(error) };
    const msg = error instanceof Error && error.message.startsWith("Content integrity") ? error.message : "The change could not be saved.";
    log.error("admin.save_failed", { type: mutation.type, error: errorSummary(error) });
    return { ok: false, message: msg };
  }
  log.info("admin.saved", { type: mutation.type, by: deps.session.email });

  deps.invalidate();

  const warnings: string[] = [];
  if (flags.length > 0) warnings.push(`Published with ${flags.length} confirmed claim flag(s): ${flags.map((f) => `"${f.match}"`).join(", ")}.`);
  if (!deps.reindex) {
    return {
      ok: true,
      message: "Saved. The storefront and the assistant's keyword retrieval now use this content (semantic index not configured).",
      warnings,
    };
  }
  try {
    const result = await deps.reindex(content);
    return { ok: true, message: `Saved and re-indexed the assistant knowledge (${result.chunks} chunks).`, warnings };
  } catch (error) {
    log.warn("admin.reindex_failed", { error: errorSummary(error) });
    return {
      ok: true,
      message: "Saved. The storefront is updated, but re-indexing the assistant's semantic search failed.",
      warnings: [...warnings, "Retry from Admin → Knowledge. Until then, outdated vectors are ignored and keyword retrieval uses the new content."],
    };
  }
}

/** Parses a rupee amount such as "499" or "499.50" into integer paise without floating-point maths. */
export function rupeesToPaise(input: string): number | null {
  const m = input.trim().replace(/,/g, "").match(/^(\d{1,7})(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  return Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0"));
}
