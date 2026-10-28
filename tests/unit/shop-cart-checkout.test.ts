import { describe, expect, it } from "vitest";
import { addLine, normalizeQuantity, parseStoredCart, removeLine, setLineQuantity, totalQuantity } from "@/lib/cart/cart";
import { addressSchema } from "@/lib/checkout/address";
import { priceCart } from "@/lib/checkout/pricing";
import { checkoutReadiness, isPincodeServiceable } from "@/lib/checkout/readiness";
import { defaultFilters, filterProducts, filtersToQuery, parseFilters } from "@/lib/content/selectors";
import { getSeedContent } from "@/lib/content/seed";
import { applyMutation } from "@/lib/data/mutations";

const ID = "prod_kmg_face_cream";
const VITC = "prod_kmg_vitc_serum";
const GLUTA_SERUM = "prod_kmg_gluta_serum";
const NIGHT = "prod_kmg_gluta_night_cream";
const CAPS = "prod_amros_gluta_vitc_caps";
const INJECT = "prod_amros_gluta_vitc_injection";

describe("shop filters operate on real product data", () => {
  const c = getSeedContent();
  const run = (f: Partial<typeof defaultFilters>) => filterProducts(c, { ...defaultFilters, ...f }).map((p) => p.id);

  it("all products by default", () => expect(run({})).toEqual([ID, VITC, GLUTA_SERUM, NIGHT, CAPS, INJECT]));
  it("category dropdown narrows by owner-mapped category", () => {
    expect(run({ category: "cream" })).toEqual([ID, NIGHT]);
    expect(run({ category: "serum" })).toEqual([VITC, GLUTA_SERUM]);
    expect(run({ category: "supplements" })).toEqual([CAPS]);
    expect(run({ category: "injectables" })).toEqual([INJECT]);
    expect(run({ category: "pigmentation" })).toEqual([ID, GLUTA_SERUM]);
    expect(run({ category: "dark-head" })).toEqual([]);
  });
  it("skin-type dropdown narrows to products confirmed for the type", () => {
    // Supplements and injections carry no skin-type positioning, so they are excluded by a skin filter.
    expect(run({ skin: "dry" })).toEqual([ID, VITC, GLUTA_SERUM, NIGHT]);
    expect(run({ skin: "sensitive" })).toEqual([ID, VITC, GLUTA_SERUM]);
  });
  it("combined filters and search", () => {
    expect(run({ category: "cream", skin: "dry", q: "avocado" })).toEqual([ID]);
    expect(run({ category: "serum", skin: "dry", q: "vitamin c" })).toEqual([VITC, GLUTA_SERUM]);
    expect(run({ category: "cream", skin: "dry", q: "retinol" })).toEqual([]);
    expect(run({ category: "tan-skin", skin: "dry" })).toEqual([VITC]);
  });
  it("parses untrusted query params into known values and back", () => {
    const f = parseFilters(c, { category: "cream", skin: "hacker", q: "  glow ", sort: "evil" });
    expect(f).toEqual({ category: "cream", skin: "all", q: "glow", sort: "featured" });
    expect(filtersToQuery(f)).toBe("?category=cream&q=glow");
    expect(filtersToQuery(defaultFilters)).toBe("");
  });
  it("sort options reorder deterministically by price and keep the full catalog", () => {
    const bySort = (sort: "featured" | "price-asc" | "price-desc" | "name") =>
      filterProducts(c, { ...defaultFilters, sort }).map((p) => p.id);
    expect(bySort("price-asc").slice(0, 3)).toEqual([VITC, GLUTA_SERUM, INJECT]);
    expect(bySort("price-desc")[0]).toBe(NIGHT);
    // Name sort relies on locale-sensitive ordering — assert only that the full catalog is present.
    expect(bySort("name")).toHaveLength(6);
  });
  it("reflects updated mappings (adding the primary product to a new verified category)", () => {
    const updated = applyMutation(c, {
      type: "product",
      value: { ...c.products[0], categoryIds: [...c.products[0].categoryIds, "fine-lines-pores"] },
    });
    expect(filterProducts(updated, { ...defaultFilters, category: "fine-lines-pores" }).map((p) => p.id)).toEqual([ID, NIGHT]);
  });
  it("hides inactive products", () => {
    const updated = applyMutation(c, { type: "product", value: { ...c.products[0], status: "draft" } });
    expect(filterProducts(updated, defaultFilters).map((p) => p.id)).not.toContain(ID);
  });
});

describe("cart", () => {
  it("rejects zero, negative, non-integer, non-numeric and excessive quantities", () => {
    for (const bad of [0, -1, 1.5, "abc", "", 11, Number.NaN, "2.5"]) expect(normalizeQuantity(bad, 10)).toBeNull();
    expect(normalizeQuantity("3", 10)).toBe(3);
  });
  it("adds, merges, caps, updates and removes lines", () => {
    let lines = addLine([], ID, 2);
    lines = addLine(lines, ID, 9, 10);
    expect(lines).toEqual([{ productId: ID, quantity: 10 }]);
    lines = setLineQuantity(lines, ID, 4);
    expect(totalQuantity(lines)).toBe(4);
    expect(setLineQuantity(lines, ID, 0)).toEqual(lines);
    expect(removeLine(lines, ID)).toEqual([]);
  });
  it("parses persisted data defensively", () => {
    expect(parseStoredCart("not json")).toEqual([]);
    expect(parseStoredCart(JSON.stringify([{ productId: ID, quantity: 2 }, { productId: ID, quantity: 1 }, { productId: "", quantity: -4 }, "x"]))).toEqual([
      { productId: ID, quantity: 3 },
    ]);
  });
});

describe("server-authoritative pricing", () => {
  const c = getSeedContent();
  it("prices from product records only, ignoring any client-supplied price", () => {
    const cart = priceCart(c, [{ productId: ID, quantity: 2, pricePaise: 1 } as never]);
    expect(cart.lines[0].unitPricePaise).toBe(119900);
    expect(cart.subtotalPaise).toBe(239800);
  });
  it("drops unknown products and caps quantity", () => {
    const cart = priceCart(c, [
      { productId: "ghost", quantity: 1 },
      { productId: ID, quantity: 50 },
    ]);
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0].quantity).toBe(10);
    expect(cart.issues.map((i) => i.productId)).toEqual(["ghost", ID]);
  });
  it("leaves the total unknown while shipping is not configured", () => {
    const cart = priceCart(c, [{ productId: ID, quantity: 1 }]);
    expect(cart.shippingPaise).toBeNull();
    expect(cart.totalPaise).toBeNull();
  });
  it("applies configured shipping and an explicit free-shipping threshold", () => {
    const configured = applyMutation(c, {
      type: "commerce",
      value: { ...c.commerce, shippingFeePaise: 6000, freeShippingThresholdPaise: 239800 },
    });
    expect(priceCart(configured, [{ productId: ID, quantity: 1 }]).totalPaise).toBe(125900);
    expect(priceCart(configured, [{ productId: ID, quantity: 2 }]).totalPaise).toBe(239800);
  });
});

describe("checkout readiness — no fake payments", () => {
  const env = {
    razorpay: { configured: false, webhookConfigured: false, livePaymentsFlag: false, keyId: undefined, keySecret: undefined, webhookSecret: undefined },
    supabase: { configured: false, authConfigured: false, url: undefined, anonKey: undefined, serviceRoleKey: undefined },
  } as never;
  it("is disabled with the seed configuration", () => {
    const r = checkoutReadiness(getSeedContent(), env);
    expect(r.livePayments).toBe(false);
    expect(r.publicReasons.length).toBeGreaterThan(0);
    expect(r.publicReasons.join(" ")).not.toMatch(/RAZORPAY|SUPABASE/);
  });
  it("is enabled only when every prerequisite is met", () => {
    let c = getSeedContent();
    c = applyMutation(c, {
      type: "commerce",
      value: { ...c.commerce, checkoutEnabled: true, shippingFeePaise: 0, pricesIncludeTax: true, serviceablePincodePrefixes: [] },
    });
    for (const p of c.policies) c = applyMutation(c, { type: "policy", value: { ...p, body: "Owner text", status: "approved" } });
    const full = {
      razorpay: { configured: true, webhookConfigured: true, livePaymentsFlag: true },
      supabase: { configured: true },
    } as never;
    expect(checkoutReadiness(c, full).livePayments).toBe(true);
    expect(checkoutReadiness(c, { ...(full as object), razorpay: { configured: true, webhookConfigured: true, livePaymentsFlag: false } } as never).livePayments).toBe(false);
  });
  it("serviceability is false until configured", () => {
    expect(isPincodeServiceable("400001", null)).toBe(false);
    expect(isPincodeServiceable("400001", [])).toBe(true);
    expect(isPincodeServiceable("400001", ["40"])).toBe(true);
    expect(isPincodeServiceable("110001", ["40"])).toBe(false);
  });
});

describe("Indian address validation", () => {
  const valid = {
    fullName: "Asha Rao",
    phone: "+91 98765 43210",
    email: "asha@example.com",
    line1: "12 MG Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
  };
  it("accepts a valid address and normalises the mobile number", () => {
    const r = addressSchema.parse(valid);
    expect(r.phone).toBe("9876543210");
  });
  it("rejects invalid PIN code, phone, state and markup", () => {
    expect(addressSchema.safeParse({ ...valid, pincode: "011001" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, pincode: "41100" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, phone: "12345" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, phone: "5876543210" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, state: "Atlantis" }).success).toBe(false);
    expect(addressSchema.safeParse({ ...valid, fullName: "<script>" }).success).toBe(false);
  });
});
