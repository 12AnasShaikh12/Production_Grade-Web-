import {
  brandSchema,
  categorySchema,
  commerceSchema,
  faqSchema,
  fallbacksSchema,
  ingredientSchema,
  knowledgeDocumentSchema,
  parseSiteContent,
  policySchema,
  productSchema,
  skinTypeSchema,
  type Brand,
  type Category,
  type Commerce,
  type Faq,
  type Fallbacks,
  type Ingredient,
  type KnowledgeDocument,
  type Policy,
  type Product,
  type SiteContent,
  type SkinType,
} from "@/lib/content/schemas";
import { z } from "zod";

export type ContentMutation =
  | { type: "product"; value: Product }
  | { type: "categories"; value: Category[] }
  | { type: "skinTypes"; value: SkinType[] }
  | { type: "ingredients"; value: Ingredient[] }
  | { type: "faq"; value: Faq }
  | { type: "deleteFaq"; id: string }
  | { type: "policy"; value: Policy }
  | { type: "knowledge"; value: KnowledgeDocument }
  | { type: "deleteKnowledge"; id: string }
  | { type: "brand"; value: Brand }
  | { type: "fallbacks"; value: Fallbacks }
  | { type: "commerce"; value: Commerce };

/** Validates a mutation payload at the boundary (defence in depth — callers also validate). */
export function validateMutation(m: ContentMutation): ContentMutation {
  switch (m.type) {
    case "product":
      return { type: m.type, value: productSchema.parse(m.value) };
    case "categories":
      return { type: m.type, value: z.array(categorySchema).min(1).parse(m.value) };
    case "skinTypes":
      return { type: m.type, value: z.array(skinTypeSchema).min(1).parse(m.value) };
    case "ingredients":
      return { type: m.type, value: z.array(ingredientSchema).parse(m.value) };
    case "faq":
      return { type: m.type, value: faqSchema.parse(m.value) };
    case "policy":
      return { type: m.type, value: policySchema.parse(m.value) };
    case "knowledge":
      return { type: m.type, value: knowledgeDocumentSchema.parse(m.value) };
    case "brand":
      return { type: m.type, value: brandSchema.parse(m.value) };
    case "fallbacks":
      return { type: m.type, value: fallbacksSchema.parse(m.value) };
    case "commerce":
      return { type: m.type, value: commerceSchema.parse(m.value) };
    case "deleteFaq":
    case "deleteKnowledge":
      return { type: m.type, id: z.string().min(1).max(80).parse(m.id) };
  }
}

function upsert<T>(list: T[], item: T, key: (x: T) => string): T[] {
  const k = key(item);
  const i = list.findIndex((x) => key(x) === k);
  if (i === -1) return [...list, item];
  const next = [...list];
  next[i] = item;
  return next;
}

/** Applies a mutation to a content document and re-validates the whole result. */
export function applyMutation(content: SiteContent, mutation: ContentMutation, now = new Date().toISOString()): SiteContent {
  const m = validateMutation(mutation);
  const next: SiteContent = structuredClone(content);
  switch (m.type) {
    case "product":
      next.products = upsert(next.products, m.value, (p) => p.id);
      break;
    case "categories":
      next.categories = m.value;
      break;
    case "skinTypes":
      next.skinTypes = m.value;
      break;
    case "ingredients":
      next.ingredients = m.value;
      break;
    case "faq":
      next.faqs = upsert(next.faqs, m.value, (f) => f.id);
      break;
    case "deleteFaq":
      next.faqs = next.faqs.filter((f) => f.id !== m.id);
      break;
    case "policy":
      next.policies = upsert(next.policies, m.value, (p) => p.slug);
      break;
    case "knowledge":
      next.knowledge = upsert(next.knowledge, m.value, (k) => k.id);
      break;
    case "deleteKnowledge":
      next.knowledge = next.knowledge.filter((k) => k.id !== m.id);
      break;
    case "brand":
      next.brand = m.value;
      break;
    case "fallbacks":
      next.fallbacks = m.value;
      break;
    case "commerce":
      next.commerce = m.value;
      break;
  }
  next.updatedAt = now;
  return parseSiteContent(next);
}
