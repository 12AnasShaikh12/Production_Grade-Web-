import type { KnowledgeDocType, SiteContent } from "@/lib/content/schemas";
import {
  approvedFaqs,
  joinList,
  productIngredients,
  productSkinTypes,
  renderFaq,
  sortedSkinTypes,
} from "@/lib/content/selectors";
import { formatINR } from "@/lib/money";

/**
 * A knowledge record as seen by the retrieval pipeline. Records are derived from the structured,
 * validated content (so the chatbot can never disagree with the storefront) plus owner-authored
 * knowledge documents. Each carries its approval and active flags; only approved + active records
 * are ever indexed or retrieved.
 */
export interface KnowledgeRecord {
  id: string;
  docType: KnowledgeDocType;
  title: string;
  content: string;
  approved: boolean;
  active: boolean;
  source: string;
  updatedAt: string;
}

const availabilityText = {
  in_stock: "is currently in stock",
  out_of_stock: "is currently out of stock",
  unconfirmed: "has not had its stock level published; checkout confirms availability",
} as const;

export function buildKnowledgeRecords(content: SiteContent): KnowledgeRecord[] {
  const records: KnowledgeRecord[] = [];
  const { brand } = content;

  records.push({
    id: "brand-identity",
    docType: "brand",
    title: `About ${brand.name}`,
    content: [
      `${brand.name} is a skincare brand. ${brand.shortDescription}`,
      `The brand phrase is "${brand.tagline}". Products are priced in Indian Rupees (INR) for customers in India.`,
      brand.address ? `${brand.name} is based at ${brand.address}. The brand operates online and does not run a walk-in retail store at this address.` : "",
      `Contact: email ${brand.email}, phone ${brand.phoneDisplay}, Instagram ${brand.instagramHandle} (${brand.instagramUrl}).`,
    ]
      .filter(Boolean)
      .join(" "),
    approved: true,
    active: true,
    source: "content.brand",
    updatedAt: content.updatedAt,
  });

  records.push({
    id: "brand-contact",
    docType: "support",
    title: `Contact ${brand.name}`,
    content: `Customers can contact ${brand.name} by email at ${brand.email}, by phone on ${brand.phoneDisplay}, or on Instagram at ${brand.instagramUrl} (${brand.instagramHandle}). The contact page is /contact.`,
    approved: true,
    active: true,
    source: "content.brand",
    updatedAt: content.updatedAt,
  });

  for (const product of content.products) {
    const active = product.status === "active";
    const ingredients = productIngredients(content, product).map((i) => i.name);
    const skinTypes = productSkinTypes(content, product).map((s) => s.label);
    const base = { approved: true, active, updatedAt: product.updatedAt, source: `content.products.${product.slug}` };
    const p = `product-${product.slug}`;

    records.push({
      ...base,
      id: `${p}-overview`,
      docType: "product",
      title: `${product.name} — overview`,
      content: [
        `${product.name} (${product.tagline}).`,
        product.shortDescription,
        product.description,
        `Price: ${formatINR(product.pricePaise)} (INR).`,
        product.sizeLabel ? `Pack size: ${product.sizeLabel}.` : "Pack size has not been published yet.",
        `The product ${availabilityText[product.availability]}.`,
        `Product page: /products/${product.slug}.`,
      ].join(" "),
    });

    records.push({
      ...base,
      id: `${p}-price`,
      docType: "product",
      title: `${product.shortName} — price`,
      content: `The current listed price of ${product.name} is ${formatINR(product.pricePaise)} per unit, in Indian Rupees (INR). The product page always shows the latest configured price. Shipping charges and taxes are shown at checkout only where they have been configured.`,
    });

    records.push({
      ...base,
      id: `${p}-ingredients`,
      docType: "ingredient",
      title: `${product.shortName} — ingredient highlights`,
      content: [
        ingredients.length
          ? `The ingredient highlights of ${product.name} are ${joinList(ingredients)}.`
          : `Ingredient highlights for ${product.name} have not been published.`,
        product.fullIngredientDeclaration
          ? `Full ingredient declaration (INCI): ${product.fullIngredientDeclaration}`
          : "These are highlights only. The complete ingredient declaration and ingredient concentrations have not been published; customers should refer to the product packaging for the full ingredient list.",
      ].join(" "),
    });

    const benefits = product.benefits.filter((b) => b.approved);
    if (benefits.length) {
      records.push({
        ...base,
        id: `${p}-benefits`,
        docType: "benefit",
        title: `${product.shortName} — approved benefit statements`,
        content: `Approved cosmetic benefit statements for ${product.shortName}: ${benefits
          .map((b) => `${b.title}: ${b.text}`)
          .join(" ")} Results depend on the formulation and individual skin response.`,
      });
    }

    records.push({
      ...base,
      id: `${p}-skin-types`,
      docType: "skin-type",
      title: `${product.shortName} — skin-type positioning and cautions`,
      content: [
        skinTypes.length
          ? `The product brief positions ${product.shortName} for ${joinList(skinTypes.map((s) => s.toLowerCase()))}.`
          : `Skin-type positioning for ${product.shortName} has not been confirmed.`,
        "This positioning does not guarantee that the formula will suit everyone.",
        `Safety notes: ${product.safetyNotes}`,
      ].join(" "),
    });

    records.push({
      ...base,
      id: `${p}-usage`,
      docType: "usage",
      title: `${product.shortName} — directions for use`,
      content: product.usageInstructions
        ? `Directions for use of ${product.shortName}: ${product.usageInstructions} ${product.safetyNotes}`
        : `Verified product-specific directions for use of ${product.shortName} have not been published yet. Customers should follow the directions on the product packaging or confirm them with the ${brand.name} team.`,
    });
  }

  for (const ingredient of content.ingredients) {
    records.push({
      id: `ingredient-${ingredient.id}`,
      docType: "ingredient",
      title: `${ingredient.name} — general ingredient information`,
      content: [
        `General information about ${ingredient.name} (general ingredient knowledge, not a verified claim about the finished Amros Beauty formula):`,
        ingredient.generalInfo,
        ingredient.verifiedProductNote ? `Verified note about the Amros Beauty formula: ${ingredient.verifiedProductNote}` : "",
      ]
        .filter(Boolean)
        .join(" "),
      approved: ingredient.approved,
      active: true,
      source: `content.ingredients.${ingredient.id}`,
      updatedAt: content.updatedAt,
    });
  }

  for (const skinType of sortedSkinTypes(content)) {
    records.push({
      id: `skin-type-${skinType.id}`,
      docType: "skin-type",
      title: `${skinType.label} — general guidance`,
      content: `${skinType.label}: ${skinType.description} This is general, non-diagnostic information.`,
      approved: true,
      active: true,
      source: `content.skinTypes.${skinType.id}`,
      updatedAt: content.updatedAt,
    });
  }

  for (const faq of content.faqs) {
    const rendered = renderFaq(content, faq);
    records.push({
      id: `faq-${faq.id}`,
      docType: "faq",
      title: rendered.question,
      content: `Question: ${rendered.question} Answer: ${rendered.answer}`,
      approved: faq.approved,
      active: true,
      source: `content.faqs.${faq.id}`,
      updatedAt: faq.updatedAt,
    });
  }

  for (const policy of content.policies) {
    const docType: KnowledgeDocType =
      policy.slug === "shipping" ? "shipping" : policy.slug === "returns" ? "returns" : policy.slug === "privacy" ? "privacy" : "other";
    records.push({
      id: `policy-${policy.slug}`,
      docType,
      title: policy.title,
      content:
        policy.status === "approved" && policy.body
          ? `${policy.title} (approved store policy, /policies/${policy.slug}): ${policy.body}`
          : `${policy.title}: ${policy.summary} The full ${policy.title.toLowerCase()} policy has not been published yet, so specific terms, fees, timelines and eligibility are not confirmed. Customers should contact ${brand.name} at ${brand.email} or ${brand.phoneDisplay}.`,
      approved: true,
      active: true,
      source: `content.policies.${policy.slug}`,
      updatedAt: policy.updatedAt,
    });
  }

  const c = content.commerce;
  const shippingFacts: string[] = [];
  if (c.shippingFeePaise !== null) shippingFacts.push(`The configured shipping fee is ${formatINR(c.shippingFeePaise)} per order.`);
  if (c.freeShippingThresholdPaise !== null)
    shippingFacts.push(`Shipping is free on orders of ${formatINR(c.freeShippingThresholdPaise)} or more.`);
  if (c.deliveryEstimate) shippingFacts.push(`The approved delivery estimate is ${c.deliveryEstimate}.`);
  if (c.pricesIncludeTax !== null)
    shippingFacts.push(c.pricesIncludeTax ? "Listed prices include applicable taxes." : "Applicable taxes are added at checkout.");
  records.push({
    id: "commerce-settings",
    docType: "shipping",
    title: "Checkout and delivery configuration",
    content: shippingFacts.length
      ? shippingFacts.join(" ")
      : `Shipping fees, delivery estimates, tax treatment and serviceable PIN codes have not been configured yet. Customers should contact ${brand.name} at ${brand.email} for accurate information.`,
    approved: true,
    active: true,
    source: "content.commerce",
    updatedAt: content.updatedAt,
  });

  for (const doc of content.knowledge) {
    records.push({
      id: `kb-${doc.id}`,
      docType: doc.docType,
      title: doc.title,
      content: doc.content,
      approved: doc.approved,
      active: doc.active,
      source: doc.source,
      updatedAt: doc.updatedAt,
    });
  }

  return records;
}

export function isAuthoritative(record: Pick<KnowledgeRecord, "approved" | "active">): boolean {
  return record.approved && record.active;
}

/** For FAQ-first deterministic answers: approved FAQs rendered with live values. */
export function renderedApprovedFaqs(content: SiteContent) {
  return approvedFaqs(content).map((f) => renderFaq(content, f));
}
