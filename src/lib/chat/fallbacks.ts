import type { FallbackIntent, Fallbacks, SiteContent } from "@/lib/content/schemas";
import { getSeedContent } from "@/lib/content/seed";
import { primaryProduct, renderTemplate, templateValues } from "@/lib/content/selectors";
import { renderedApprovedFaqs } from "./knowledge";
import { LexicalIndex } from "./lexical";
import { chunkRecord } from "./chunking";

/**
 * Deterministic fallback responses. Works with no NVIDIA access, no network and no database:
 * every value is rendered from the current (or bundled seed) content, so prices and contact
 * details can never drift from the product record. No generative output is used here.
 */

/** Built-in safe defaults, used if an editable fallback is missing. */
export const DEFAULT_FALLBACKS: Fallbacks = getSeedContent().fallbacks;

export interface FallbackResult {
  answer: string;
  intent: FallbackIntent;
  /** True when the answer explicitly says the information could not be verified. */
  unverified: boolean;
  faqId?: string;
}

const UNVERIFIED_INTENTS = new Set<FallbackIntent>(["unknown", "usage", "shipping", "returns", "orders"]);

function template(content: SiteContent, intent: FallbackIntent): string {
  return content.fallbacks[intent] ?? DEFAULT_FALLBACKS[intent] ?? DEFAULT_FALLBACKS.unknown!;
}

/** Finds an approved FAQ that clearly answers the question (deterministic lexical match). */
export function matchFaq(content: SiteContent, question: string, minScore = 2.5) {
  const faqs = renderedApprovedFaqs(content);
  if (faqs.length === 0) return undefined;
  const chunks = faqs.map((f) =>
    chunkRecord(
      {
        id: f.id,
        docType: "faq",
        title: f.question,
        content: f.question,
        approved: true,
        active: true,
        source: "faq",
        updatedAt: f.updatedAt,
      },
      { maxChars: 2000 },
    )[0],
  );
  const [best] = new LexicalIndex(chunks).search(question, 1);
  if (!best || best.score < minScore) return undefined;
  return faqs.find((f) => f.id === best.chunk.documentId);
}

export function fallbackAnswer(content: SiteContent, intent: FallbackIntent, question = ""): FallbackResult {
  const values = templateValues(content);
  const product = primaryProduct(content);
  const render = (i: FallbackIntent) => renderTemplate(template(content, i), values);
  const result = (answer: string, i: FallbackIntent = intent, unverified = UNVERIFIED_INTENTS.has(i)): FallbackResult => ({
    answer,
    intent: i,
    unverified,
  });

  switch (intent) {
    case "product":
    case "price":
    case "ingredients":
      if (!product) return result(render("unknown"), "unknown");
      if (intent === "ingredients" && product.fullIngredientDeclaration)
        return result(`${render("ingredients")} The full ingredient declaration is listed on the product page.`);
      return result(render(intent));

    case "skinType":
      if (!product) return result(render("unknown"), "unknown");
      return product.skinTypeIds.length ? result(render("skinType")) : result(render("skinTypeUnset"), "skinTypeUnset", true);

    case "usage":
      if (product?.usageInstructions)
        return result(`Directions for use for ${product.shortName}: ${product.usageInstructions} ${product.safetyNotes}`, "usage", false);
      return result(render("usage"));

    case "shipping":
    case "returns": {
      const policy = content.policies.find((p) => p.slug === intent);
      if (policy?.status === "approved" && policy.body)
        return result(`${policy.summary} You can read the full ${policy.title} policy at /policies/${policy.slug}.`, intent, false);
      return result(render(intent));
    }

    case "unknown": {
      const faq = question ? matchFaq(content, question) : undefined;
      if (faq) return { answer: faq.answer, intent: "unknown", unverified: false, faqId: faq.id };
      return result(render("unknown"));
    }

    default:
      return result(render(intent));
  }
}
