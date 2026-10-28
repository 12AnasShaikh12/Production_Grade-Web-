import { formatINR } from "@/lib/money";
import type { Category, Faq, Ingredient, Product, SiteContent, SkinType, Testimonial } from "./schemas";

/** Pure read helpers shared by the storefront, chatbot and admin. */

export function isPurchasable(product: Product): boolean {
  return product.status === "active" && product.availability !== "out_of_stock";
}

export function activeProducts(content: SiteContent): Product[] {
  return content.products.filter((p) => p.status === "active");
}

export function getProductBySlug(content: SiteContent, slug: string): Product | undefined {
  return content.products.find((p) => p.slug === slug && p.status === "active");
}

export function getProductById(content: SiteContent, id: string): Product | undefined {
  return content.products.find((p) => p.id === id && p.status === "active");
}

/** The featured product is the first active product — the store currently has exactly one. */
export function primaryProduct(content: SiteContent): Product | undefined {
  return activeProducts(content)[0];
}

export function sortedCategories(content: SiteContent): Category[] {
  return [...content.categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function sortedSkinTypes(content: SiteContent): SkinType[] {
  return [...content.skinTypes].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function productIngredients(content: SiteContent, product: Product): Ingredient[] {
  return product.ingredientIds
    .map((id) => content.ingredients.find((i) => i.id === id))
    .filter((i): i is Ingredient => Boolean(i));
}

export function productSkinTypes(content: SiteContent, product: Product): SkinType[] {
  return sortedSkinTypes(content).filter((s) => product.skinTypeIds.includes(s.id));
}

export function productCategories(content: SiteContent, product: Product): Category[] {
  return sortedCategories(content).filter((c) => !c.isAll && product.categoryIds.includes(c.id));
}

export function approvedFaqs(content: SiteContent): Faq[] {
  return content.faqs.filter((f) => f.approved).sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Testimonials the storefront is allowed to render. Unapproved entries are suppressed, and a
 * testimonial that targets a specific product is only kept if the product is still active —
 * otherwise it would advertise a product the shop can't fulfil.
 */
export function approvedTestimonials(content: SiteContent): Testimonial[] {
  const activeIds = new Set(activeProducts(content).map((p) => p.id));
  return content.testimonials.filter((t) => {
    if (!t.approved) return false;
    if (t.productId && !activeIds.has(t.productId)) return false;
    return true;
  });
}

export function joinList(items: string[], conjunction = "and"): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items[items.length - 1]}`;
}

// ---------------------------------------------------------------------------------------------
// Shop filtering
// ---------------------------------------------------------------------------------------------

export const sortOptions = [
  { id: "featured", label: "Featured" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
  { id: "name", label: "Name: A–Z" },
] as const;

export type SortId = (typeof sortOptions)[number]["id"];

export interface ShopFilters {
  category: string;
  skin: string;
  q: string;
  sort: SortId;
}

export const defaultFilters: ShopFilters = { category: "all", skin: "all", q: "", sort: "featured" };

/** Normalises untrusted query parameters into known filter values. */
export function parseFilters(content: SiteContent, params: Record<string, string | string[] | undefined>): ShopFilters {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const category = first(params.category);
  const skin = first(params.skin);
  const sort = first(params.sort);
  return {
    category: content.categories.some((c) => c.id === category) ? category : "all",
    skin: content.skinTypes.some((s) => s.id === skin) ? skin : "all",
    q: first(params.q).trim().slice(0, 80),
    sort: sortOptions.some((o) => o.id === sort) ? (sort as SortId) : "featured",
  };
}

export function filtersToQuery(filters: ShopFilters): string {
  const qs = new URLSearchParams();
  if (filters.category !== "all") qs.set("category", filters.category);
  if (filters.skin !== "all") qs.set("skin", filters.skin);
  if (filters.q) qs.set("q", filters.q);
  if (filters.sort !== "featured") qs.set("sort", filters.sort);
  const s = qs.toString();
  return s ? `?${s}` : "";
}

function normalise(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^\p{L}\p{N}\s]/gu, " ");
}

export function productSearchText(content: SiteContent, product: Product): string {
  return normalise(
    [
      product.name,
      product.shortName,
      product.tagline,
      product.shortDescription,
      ...productIngredients(content, product).map((i) => i.name),
      ...productCategories(content, product).map((c) => c.label),
      ...productSkinTypes(content, product).map((s) => s.label),
    ].join(" "),
  );
}

export function filterProducts(content: SiteContent, filters: ShopFilters): Product[] {
  const category = content.categories.find((c) => c.id === filters.category);
  const terms = normalise(filters.q).split(/\s+/).filter(Boolean);
  const result = activeProducts(content).filter((p) => {
    if (category && !category.isAll && !p.categoryIds.includes(category.id)) return false;
    if (filters.skin !== "all" && !p.skinTypeIds.includes(filters.skin)) return false;
    if (terms.length > 0) {
      const haystack = productSearchText(content, p);
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });
  switch (filters.sort) {
    case "price-asc":
      return result.sort((a, b) => a.pricePaise - b.pricePaise);
    case "price-desc":
      return result.sort((a, b) => b.pricePaise - a.pricePaise);
    case "name":
      return result.sort((a, b) => a.name.localeCompare(b.name));
    default:
      return result;
  }
}

// ---------------------------------------------------------------------------------------------
// Template rendering for FAQ answers and fallback copy
// ---------------------------------------------------------------------------------------------

export function templateValues(content: SiteContent, product = primaryProduct(content)): Record<string, string> {
  const skinTypes = product ? productSkinTypes(content, product).map((s) => s.label.toLowerCase()) : [];
  return {
    brandName: content.brand.name,
    email: content.brand.email,
    phone: content.brand.phoneDisplay,
    instagram: content.brand.instagramUrl,
    productName: product?.name ?? `${content.brand.name} products`,
    productShortName: product?.shortName ?? content.brand.name,
    price: product ? formatINR(product.pricePaise) : "not yet listed",
    ingredients: product ? joinList(productIngredients(content, product).map((i) => i.name)) : "not yet listed",
    skinTypes: skinTypes.length > 0 ? joinList(skinTypes) : "no confirmed skin types",
    usage: product?.usageInstructions ?? "",
  };
}

/** Replaces `{token}` placeholders. Unknown tokens are removed rather than shown raw. */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z]+)\}/g, (_, key: string) => values[key] ?? "").replace(/\s{2,}/g, " ").trim();
}

export function renderFaq(content: SiteContent, faq: Faq): Faq {
  return { ...faq, answer: renderTemplate(faq.answer, templateValues(content)) };
}
