import type { SiteContent } from "@/lib/content/schemas";
import { getSeedContent } from "@/lib/content/seed";
import { errorSummary, log } from "@/lib/log";
import { getRepository, type RepositoryKind } from "./repositories";

export interface LoadedContent {
  content: SiteContent;
  source: RepositoryKind;
  /** True when the configured store failed and the bundled seed is being served instead. */
  degraded: boolean;
}

/**
 * Loads content from the configured repository. If the store is unreachable, the validated
 * bundled seed is returned so the storefront and chatbot keep working with known facts.
 */
export async function loadContent(): Promise<LoadedContent> {
  const repo = getRepository();
  try {
    return { content: await repo.load(), source: repo.kind, degraded: false };
  } catch (error) {
    log.error("content.load_failed", { source: repo.kind, error: errorSummary(error) });
    return { content: getSeedContent(), source: "seed", degraded: true };
  }
}
