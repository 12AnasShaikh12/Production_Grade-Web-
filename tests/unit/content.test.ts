import { describe, expect, it } from "vitest";
import { findClaimFlags, unsupportedClaimFlags } from "@/lib/content/claims";
import { parseSiteContent } from "@/lib/content/schemas";
import { getSeedContent } from "@/lib/content/seed";
import { applyMutation } from "@/lib/data/mutations";
import { compareAtPaise, discountPercent, formatINR, multiplyPaise, paiseToDecimalString, sumPaise } from "@/lib/money";

describe("money (integer paise)", () => {
  it("formats ₹499 from 49900 paise with en-IN INR", () => {
    expect(formatINR(49900)).toBe("₹499");
    expect(formatINR(49950)).toBe("₹499.50");
    expect(formatINR(12345600)).toBe("₹1,23,456");
  });
  it("uses integer arithmetic and rejects invalid amounts", () => {
    expect(multiplyPaise(49900, 3)).toBe(149700);
    expect(sumPaise([49900, 49900, 6000])).toBe(105800);
    expect(paiseToDecimalString(49900)).toBe("499.00");
    expect(() => formatINR(499.5)).toThrow();
    expect(() => multiplyPaise(49900, -1)).toThrow();
  });
  it("derives a strike-through compare-at price with a classic ₹X99 markup", () => {
    // 50% markup, rounded to the nearest ₹100 then stepped back by ₹1 for an ending in 99.
    expect(compareAtPaise(119900)).toBe(179900); // ₹1,199 → ₹1,799
    expect(compareAtPaise(64900)).toBe(99900); // ₹649   → ₹999
    expect(compareAtPaise(89900)).toBe(129900); // ₹899   → ₹1,299
    expect(compareAtPaise(199900)).toBe(299900); // ₹1,999 → ₹2,999
    expect(compareAtPaise(99900)).toBe(149900); // ₹999   → ₹1,499
    expect(compareAtPaise(0)).toBeNull();
  });
  it("reports the integer discount percent from compare-at to listed price", () => {
    expect(discountPercent(119900, 179900)).toBe(33);
    expect(discountPercent(64900, 99900)).toBe(35);
    expect(discountPercent(199900, 299900)).toBe(33);
    expect(discountPercent(99900, 99900)).toBe(0);
    expect(discountPercent(99900, 50000)).toBe(0);
  });
});

describe("seed content — owner brief as source of truth", () => {
  const c = getSeedContent();
  const product = c.products[0];

  it("validates and passes integrity checks", () => {
    expect(() => parseSiteContent(c)).not.toThrow();
  });
  it("seeds the six owner-supplied products with the primary KMG face cream first at ₹1,199 (119900 paise)", () => {
    expect(c.products).toHaveLength(6);
    expect(product.id).toBe("prod_kmg_face_cream");
    expect(product.name).toBe("Amros Beauty KMG (Korean Magic Glow) Face Cream");
    expect(product.pricePaise).toBe(119900);
    expect(product.sizeLabel).toBe("30 g");
    expect(product.currency).toBe("INR");
    // Prices match the sequence the owner supplied for images 1..6.
    expect(c.products.map((p) => p.pricePaise)).toEqual([119900, 64900, 89900, 199900, 119900, 99900]);
  });
  it("normalises the supplied contact details and spelling", () => {
    expect(c.brand.email).toBe("kp2569481@gmail.com");
    expect(c.brand.instagramUrl).toBe("https://www.instagram.com/amros_beauty/");
    expect(c.brand.phoneDisplay).toBe("+91 88793 79724");
    const nia = c.ingredients.find((i) => i.id === "niacinamide")!;
    expect(nia.name).toBe("Niacinamide");
    expect(nia.suppliedName).toBe("Nilacinamide");
    const avocado = c.ingredients.find((i) => i.id === "avocado")!;
    expect(avocado.name).toBe("Avocado");
    expect(avocado.suppliedName).toBe("Avacado");
  });
  it("maps the primary product into its verified categories and supplied skin types", () => {
    expect(product.categoryIds).toEqual(["cream", "skin-brightening", "pigmentation"]);
    expect(product.skinTypeIds).toEqual(["dry", "sensitive"]);
  });
  it("records unapproved category interpretations", () => {
    expect(c.categories.find((x) => x.id === "dark-head")).toMatchObject({ label: "Blackheads & Dark Spots", labelApproved: false });
    expect(c.categories.find((x) => x.id === "skin-brightening")?.ownerLabel).toBe("Skin whitening");
  });
  it("does not invent unknown facts", () => {
    expect(product.fullIngredientDeclaration).toBeNull();
    expect(product.usageInstructions).toBeNull();
    expect(product.availability).toBe("unconfirmed");
    expect(c.policies.every((p) => p.body === null && p.status === "missing")).toBe(true);
    expect(c.commerce.shippingFeePaise).toBeNull();
    // The product-page sizeLabel is confirmed from the pack; the serum sizes are still null.
    const serum = c.products.find((p) => p.id === "prod_kmg_vitc_serum")!;
    expect(serum.sizeLabel).toBeNull();
  });
  it("seeded public copy contains no unsupported claims", () => {
    const text = c.products
      .flatMap((p) => [p.description, p.shortDescription, ...p.benefits.map((b) => b.text)])
      .concat(c.ingredients.map((i) => i.generalInfo))
      .concat(c.testimonials.map((t) => t.quote))
      .join("\n");
    expect(findClaimFlags(text)).toEqual([]);
  });
  it("exposes only approved testimonials that reference known active products", () => {
    expect(c.testimonials.length).toBeGreaterThan(0);
    for (const t of c.testimonials) {
      expect(t.approved).toBe(true);
      if (t.productId) {
        expect(c.products.find((p) => p.id === t.productId)).toBeTruthy();
      }
    }
  });
  it("returns independent copies", () => {
    const a = getSeedContent();
    a.products[0].pricePaise = 1;
    expect(getSeedContent().products[0].pricePaise).toBe(119900);
  });
});

describe("content mutations", () => {
  it("rejects a product referencing an unknown category", () => {
    const c = getSeedContent();
    const bad = { ...c.products[0], categoryIds: ["nope"] };
    expect(() => applyMutation(c, { type: "product", value: bad })).toThrow(/unknown category/);
  });
  it("rejects zero or fractional prices", () => {
    const c = getSeedContent();
    expect(() => applyMutation(c, { type: "product", value: { ...c.products[0], pricePaise: 0 } })).toThrow();
    expect(() => applyMutation(c, { type: "product", value: { ...c.products[0], pricePaise: 499.5 } })).toThrow();
  });
});

describe("claim control", () => {
  it("flags whitening, cures, guarantees, certifications and concentrations", () => {
    const ids = findClaimFlags("Permanently whitens skin, cures acne, clinically proven, paraben-free, made in Korea, 20% vitamin C").map((f) => f.id);
    expect(ids).toEqual(expect.arrayContaining(["whitening", "medical", "guarantee", "clinical", "free-from", "origin", "concentration"]));
  });
  it("allows claims only when present in the evidence", () => {
    expect(unsupportedClaimFlags("Contains 20% vitamin C", "Vitamin C is a highlight")).toHaveLength(1);
    expect(unsupportedClaimFlags("Contains 20% vitamin C", "Contains 20% vitamin C")).toHaveLength(0);
  });
});
