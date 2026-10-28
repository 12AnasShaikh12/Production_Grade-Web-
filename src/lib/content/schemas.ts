import { z } from "zod";

/**
 * Validated content model. Every piece of customer-facing copy, price, mapping and chatbot
 * knowledge lives in a `SiteContent` document so it can be edited without touching UI code.
 */

const id = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens only");

const timestamp = z.iso.datetime({ offset: true });

const nonEmpty = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v ? v : null));

export const brandSchema = z.object({
  name: nonEmpty(80),
  tagline: nonEmpty(120),
  shortDescription: nonEmpty(400),
  email: z.email(),
  phoneDisplay: nonEmpty(30),
  phoneE164: z.string().regex(/^\+[1-9]\d{7,14}$/, "Use E.164 format, e.g. +918879379724"),
  instagramUrl: z.url().refine((u) => u.startsWith("https://www.instagram.com/"), "Must be an instagram.com URL"),
  instagramHandle: nonEmpty(60),
  country: z.literal("IN"),
  currency: z.literal("INR"),
  /** Full postal address line shown in the footer, contact page and chatbot knowledge. */
  address: optionalText(240),
});

export const categorySchema = z.object({
  id,
  label: nonEmpty(60),
  /** The wording the owner originally supplied, kept for traceability. */
  ownerLabel: nonEmpty(60),
  description: nonEmpty(300),
  sortOrder: z.int().min(0).max(999),
  /** False while a display label is our interpretation of the owner's wording. */
  labelApproved: z.boolean(),
  /** The virtual "all products" category matches every active product. */
  isAll: z.boolean().default(false),
});

export const skinTypeSchema = z.object({
  id,
  label: nonEmpty(60),
  description: nonEmpty(400),
  sortOrder: z.int().min(0).max(999),
});

export const ingredientSchema = z.object({
  id,
  name: nonEmpty(80),
  /** Spelling originally supplied by the owner, when normalised. */
  suppliedName: optionalText(80),
  /** Short, cautious description of the ingredient's general cosmetic role. */
  role: nonEmpty(300),
  /** General ingredient education — explicitly not a claim about the finished product. */
  generalInfo: nonEmpty(1200),
  /** A verified statement about this ingredient in the finished formula, if one exists. */
  verifiedProductNote: optionalText(600),
  image: z.string().startsWith("/"),
  approved: z.boolean(),
});

export const productImageSchema = z.object({
  src: z.string().refine((s) => s.startsWith("/") || s.startsWith("https://"), "Use a site-relative path or https URL"),
  alt: z.string().trim().max(200),
  width: z.int().positive().max(6000),
  height: z.int().positive().max(6000),
  /** Concept renders must be labelled as such on the storefront. */
  kind: z.enum(["concept", "photo"]),
});

export const benefitSchema = z.object({
  id,
  title: nonEmpty(80),
  text: nonEmpty(400),
  approved: z.boolean(),
});

export const productStatus = z.enum(["active", "draft", "archived"]);
export const availabilityStatus = z.enum(["in_stock", "out_of_stock", "unconfirmed"]);

export const productSchema = z.object({
  id: z.string().min(1).max(64),
  slug: id,
  name: nonEmpty(140),
  shortName: nonEmpty(60),
  tagline: nonEmpty(140),
  shortDescription: nonEmpty(300),
  description: nonEmpty(3000),
  pricePaise: z.int().positive().max(10_000_000),
  currency: z.literal("INR"),
  sizeLabel: optionalText(40),
  images: z.array(productImageSchema).min(1).max(12),
  ingredientIds: z.array(id).max(30),
  fullIngredientDeclaration: optionalText(4000),
  benefits: z.array(benefitSchema).max(12),
  categoryIds: z.array(id).max(20),
  skinTypeIds: z.array(id).max(10),
  usageInstructions: optionalText(1500),
  safetyNotes: nonEmpty(1500),
  status: productStatus,
  availability: availabilityStatus,
  seoTitle: nonEmpty(70),
  seoDescription: nonEmpty(170),
  /** Owner sign-off that the product copy reflects the real formulation. */
  claimsApproved: z.boolean(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const faqCategory = z.enum(["product", "ingredients", "skin", "orders", "support"]);

export const faqSchema = z.object({
  id,
  question: nonEmpty(240),
  answer: nonEmpty(1500),
  category: faqCategory,
  sortOrder: z.int().min(0).max(999),
  approved: z.boolean(),
  updatedAt: timestamp,
});

export const policySlug = z.enum(["shipping", "returns", "privacy", "terms"]);
export const policyStatus = z.enum(["missing", "draft", "approved"]);

export const policySchema = z.object({
  slug: policySlug,
  title: nonEmpty(80),
  summary: nonEmpty(400),
  /** Owner-supplied policy text. Null until the owner provides it. */
  body: optionalText(20000),
  status: policyStatus,
  updatedAt: timestamp,
});

export const knowledgeDocType = z.enum([
  "brand",
  "product",
  "ingredient",
  "benefit",
  "skin-type",
  "usage",
  "faq",
  "shipping",
  "returns",
  "privacy",
  "support",
  "availability",
  "specification",
  "other",
]);

/** Owner-authored knowledge records (in addition to records derived from structured content). */
export const knowledgeDocumentSchema = z.object({
  id,
  docType: knowledgeDocType,
  title: nonEmpty(140),
  content: nonEmpty(6000),
  approved: z.boolean(),
  active: z.boolean(),
  source: nonEmpty(200),
  updatedAt: timestamp,
});

export const fallbackIntent = z.enum([
  "greeting",
  "identity",
  "product",
  "price",
  "ingredients",
  "skinType",
  "skinTypeUnset",
  "usage",
  "shipping",
  "returns",
  "orders",
  "contact",
  "medical",
  "refusal",
  "unknown",
]);

export const fallbacksSchema = z.record(fallbackIntent, z.string().trim().min(1).max(1200));

export const commerceSchema = z.object({
  /** Owner switch; live payments additionally require credentials and approved policies. */
  checkoutEnabled: z.boolean(),
  /** Flat shipping fee in paise. Null means "not configured" — checkout stays disabled. */
  shippingFeePaise: z.int().min(0).max(1_000_000).nullable(),
  /** Optional free-shipping threshold in paise; only applied when explicitly configured. */
  freeShippingThresholdPaise: z.int().min(0).max(100_000_000).nullable(),
  /** Whether listed prices include GST. Null means "not confirmed". */
  pricesIncludeTax: z.boolean().nullable(),
  /** Free-text delivery estimate approved by the owner, e.g. "5–7 business days". */
  deliveryEstimate: optionalText(120),
  /** PIN-code prefixes served. Null = not configured; empty array = all of India confirmed. */
  serviceablePincodePrefixes: z.array(z.string().regex(/^[1-9]\d{0,5}$/)).nullable(),
  maxQuantityPerLine: z.int().min(1).max(50),
});

/**
 * Owner-curated customer testimonials. Rendered on the storefront as social proof. Every quote
 * must be approved by the owner (`approved: true`) before it is shown; unapproved entries stay
 * in the record for traceability but never surface in the UI.
 *
 * The quote itself is subject to the same claim-control pass as the rest of the public copy —
 * see `validateContentIntegrity` — so a testimonial cannot smuggle unverified claims such as
 * "cures acne", "100% safe" or a specific ingredient percentage onto the page.
 */
export const testimonialSchema = z.object({
  id,
  /** Display name (first name or first name + last initial is preferred). */
  author: nonEmpty(80),
  /** Instagram handle including `@`, e.g. `@amros_customer`. Null when not provided. */
  handle: optionalText(60),
  /** Optional city/state line, e.g. "Pune, Maharashtra". */
  location: optionalText(80),
  /** The testimonial text — a cautious statement about the experience, not a medical claim. */
  quote: nonEmpty(600),
  /** 1-5 star rating. Null when the author did not supply one. */
  rating: z.int().min(1).max(5).nullable(),
  /** ISO date the testimonial was shared (not strict time). */
  sharedOn: optionalText(40),
  /** Which product this testimonial references, if any. Must be a known product id. */
  productId: optionalText(64),
  /** Owner approval. Only approved testimonials appear on the storefront. */
  approved: z.boolean(),
  updatedAt: timestamp,
});

export const siteContentSchema = z.object({
  version: z.literal(1),
  brand: brandSchema,
  categories: z.array(categorySchema).min(1),
  skinTypes: z.array(skinTypeSchema).min(1),
  ingredients: z.array(ingredientSchema),
  products: z.array(productSchema),
  faqs: z.array(faqSchema),
  policies: z.array(policySchema),
  knowledge: z.array(knowledgeDocumentSchema),
  testimonials: z.array(testimonialSchema).default([]),
  fallbacks: fallbacksSchema,
  commerce: commerceSchema,
  updatedAt: timestamp,
});

export type Brand = z.infer<typeof brandSchema>;
export type Category = z.infer<typeof categorySchema>;
export type SkinType = z.infer<typeof skinTypeSchema>;
export type Ingredient = z.infer<typeof ingredientSchema>;
export type ProductImage = z.infer<typeof productImageSchema>;
export type Benefit = z.infer<typeof benefitSchema>;
export type Product = z.infer<typeof productSchema>;
export type Faq = z.infer<typeof faqSchema>;
export type FaqCategory = z.infer<typeof faqCategory>;
export type Policy = z.infer<typeof policySchema>;
export type PolicySlug = z.infer<typeof policySlug>;
export type KnowledgeDocument = z.infer<typeof knowledgeDocumentSchema>;
export type KnowledgeDocType = z.infer<typeof knowledgeDocType>;
export type FallbackIntent = z.infer<typeof fallbackIntent>;
export type Fallbacks = z.infer<typeof fallbacksSchema>;
export type Commerce = z.infer<typeof commerceSchema>;
export type Testimonial = z.infer<typeof testimonialSchema>;
export type SiteContent = z.infer<typeof siteContentSchema>;

/** Cross-record integrity checks that a single schema cannot express. */
export function validateContentIntegrity(content: SiteContent): string[] {
  const problems: string[] = [];
  const categoryIds = new Set(content.categories.map((c) => c.id));
  const skinTypeIds = new Set(content.skinTypes.map((s) => s.id));
  const ingredientIds = new Set(content.ingredients.map((i) => i.id));
  const slugs = new Set<string>();
  const productIds = new Set<string>();

  for (const p of content.products) {
    if (slugs.has(p.slug)) problems.push(`Duplicate product slug "${p.slug}"`);
    if (productIds.has(p.id)) problems.push(`Duplicate product id "${p.id}"`);
    slugs.add(p.slug);
    productIds.add(p.id);
    for (const c of p.categoryIds) if (!categoryIds.has(c)) problems.push(`${p.slug}: unknown category "${c}"`);
    for (const s of p.skinTypeIds) if (!skinTypeIds.has(s)) problems.push(`${p.slug}: unknown skin type "${s}"`);
    for (const i of p.ingredientIds) if (!ingredientIds.has(i)) problems.push(`${p.slug}: unknown ingredient "${i}"`);
  }
  const dup = (ids: string[], label: string) => {
    const seen = new Set<string>();
    for (const x of ids) {
      if (seen.has(x)) problems.push(`Duplicate ${label} id "${x}"`);
      seen.add(x);
    }
  };
  dup(content.categories.map((c) => c.id), "category");
  dup(content.skinTypes.map((s) => s.id), "skin type");
  dup(content.ingredients.map((i) => i.id), "ingredient");
  dup(content.faqs.map((f) => f.id), "FAQ");
  dup(content.knowledge.map((k) => k.id), "knowledge");
  dup(content.policies.map((p) => p.slug), "policy");
  dup(content.testimonials.map((t) => t.id), "testimonial");
  for (const t of content.testimonials) {
    if (t.productId && !productIds.has(t.productId)) {
      problems.push(`testimonial "${t.id}" references unknown product "${t.productId}"`);
    }
  }
  return problems;
}

export function parseSiteContent(input: unknown): SiteContent {
  const content = siteContentSchema.parse(input);
  const problems = validateContentIntegrity(content);
  if (problems.length > 0) {
    throw new Error(`Content integrity check failed: ${problems.join("; ")}`);
  }
  return content;
}
