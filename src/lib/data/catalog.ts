import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { loadContent, type LoadedContent } from "./content";

export const CONTENT_TAG = "site-content";

/**
 * Cached content for rendering. Tagged so admin saves can expire it immediately (`updateTag`).
 * A degraded (fallback) result is cached briefly so recovery is picked up quickly.
 */
export async function getCachedContent(): Promise<LoadedContent> {
  "use cache";
  cacheTag(CONTENT_TAG);
  const loaded = await loadContent();
  if (loaded.degraded) cacheLife("seconds");
  else cacheLife("minutes");
  return loaded;
}

export async function getSiteContent() {
  return (await getCachedContent()).content;
}
