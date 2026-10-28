import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildLaunchChecklist } from "@/lib/admin/checklist";
import { rupeesToPaise, saveContent } from "@/lib/admin/operations";
import { createLocalSession, passwordMatches, verifyLocalSession } from "@/lib/auth/session";
import { setEnvForTesting, getEnv } from "@/lib/config/env";
import { getSeedContent } from "@/lib/content/seed";
import { applyMutation, type ContentMutation } from "@/lib/data/mutations";
import { SeedRepository, type ContentRepository } from "@/lib/data/repositories";
import { redact } from "@/lib/log";
import { verifyPaymentSignature, verifyWebhookSignature } from "@/lib/payments/razorpay";

function memoryRepo(): ContentRepository & { content: ReturnType<typeof getSeedContent> } {
  const repo = {
    kind: "local" as const,
    writable: true,
    content: getSeedContent(),
    load: async () => repo.content,
    mutate: async (m: ContentMutation) => {
      repo.content = applyMutation(repo.content, m);
      return repo.content;
    },
  };
  return repo;
}

const priceChange = (paise: number): ContentMutation => {
  const p = getSeedContent().products[0];
  return { type: "product", value: { ...p, pricePaise: paise } };
};

describe("admin mutations are authorised server-side", () => {
  it("rejects unauthenticated changes without touching storage", async () => {
    const repo = memoryRepo();
    const mutate = vi.spyOn(repo, "mutate");
    const res = await saveContent({ session: null, repo, invalidate: vi.fn() }, priceChange(1));
    expect(res.ok).toBe(false);
    expect(mutate).not.toHaveBeenCalled();
  });

  it("persists, invalidates caches and re-indexes on success", async () => {
    const repo = memoryRepo();
    const invalidate = vi.fn();
    const reindex = vi.fn(async () => ({ documents: 3, chunks: 9, model: "m", fingerprint: "f" }));
    const res = await saveContent({ session: { email: "a@b.c" }, repo, invalidate, reindex }, priceChange(59900));
    expect(res).toMatchObject({ ok: true });
    expect(res.message).toMatch(/re-indexed/);
    expect(repo.content.products[0].pricePaise).toBe(59900);
    expect(invalidate).toHaveBeenCalledOnce();
    expect(reindex).toHaveBeenCalledWith(repo.content);
  });

  it("reports a re-index failure honestly instead of claiming full success", async () => {
    const res = await saveContent(
      { session: { email: "a@b.c" }, repo: memoryRepo(), invalidate: vi.fn(), reindex: async () => Promise.reject(new Error("429")) },
      priceChange(59900),
    );
    expect(res.ok).toBe(true);
    expect(res.message).toMatch(/re-indexing .* failed/);
  });

  it("requires explicit confirmation before publishing unsupported claims", async () => {
    const repo = memoryRepo();
    const p = getSeedContent().products[0];
    const mutation: ContentMutation = { type: "product", value: { ...p, shortDescription: "Clinically proven to permanently whiten skin." } };
    const deps = { session: { email: "a@b.c" }, repo, invalidate: vi.fn() };
    const blocked = await saveContent(deps, mutation, { claimTexts: [mutation.value.shortDescription] });
    expect(blocked).toMatchObject({ ok: false, needsClaimConfirmation: true });
    expect(repo.content.products[0].shortDescription).not.toMatch(/whiten/);
    const confirmed = await saveContent(deps, mutation, { claimTexts: [mutation.value.shortDescription], confirmClaims: true });
    expect(confirmed.ok).toBe(true);
    expect(confirmed.warnings?.[0]).toMatch(/confirmed claim flag/);
  });

  it("refuses edits when storage is read-only and surfaces validation errors", async () => {
    const ro = await saveContent({ session: { email: "a@b.c" }, repo: new SeedRepository(), invalidate: vi.fn() }, priceChange(100));
    expect(ro.message).toMatch(/read-only/);
    const invalid = await saveContent({ session: { email: "a@b.c" }, repo: memoryRepo(), invalidate: vi.fn() }, priceChange(-5));
    expect(invalid.ok).toBe(false);
  });

  it("parses rupee prices to integer paise", () => {
    expect(rupeesToPaise("499")).toBe(49900);
    expect(rupeesToPaise("499.5")).toBe(49950);
    expect(rupeesToPaise("1,299.99")).toBe(129999);
    expect(rupeesToPaise("4.999")).toBeNull();
    expect(rupeesToPaise("-1")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
  });
});

describe("local admin sessions", () => {
  const secret = "s".repeat(40);
  it("verifies valid tokens and rejects tampered, expired or unsigned ones", () => {
    const token = createLocalSession(secret);
    expect(verifyLocalSession(token, secret)).not.toBeNull();
    expect(verifyLocalSession(token, "x".repeat(40))).toBeNull();
    expect(verifyLocalSession(`${token.split(".")[0]}.forged`, secret)).toBeNull();
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "local-admin", exp: 9e9 })).toString("base64url");
    expect(verifyLocalSession(`${forgedPayload}.${token.split(".")[1]}`, secret)).toBeNull();
    expect(verifyLocalSession(createLocalSession(secret, Date.now() - 9 * 3600 * 1000), secret)).toBeNull();
    expect(verifyLocalSession(undefined, secret)).toBeNull();
  });
  it("compares passwords safely", () => {
    expect(passwordMatches("correct horse", "correct horse")).toBe(true);
    expect(passwordMatches("wrong", "correct horse")).toBe(false);
  });
  it("disables password login in production and without a strong secret", () => {
    setEnvForTesting({ NODE_ENV: "production", ADMIN_LOCAL_PASSWORD: "pw", ADMIN_SESSION_SECRET: secret });
    expect(getEnv().admin.localLoginEnabled).toBe(false);
    setEnvForTesting({ NODE_ENV: "development", ADMIN_LOCAL_PASSWORD: "pw", ADMIN_SESSION_SECRET: "short" });
    expect(getEnv().admin.localLoginEnabled).toBe(false);
    setEnvForTesting({ NODE_ENV: "development", ADMIN_LOCAL_PASSWORD: "pw", ADMIN_SESSION_SECRET: secret });
    expect(getEnv().admin.localLoginEnabled).toBe(true);
    setEnvForTesting(undefined);
  });
});

describe("Razorpay signature verification", () => {
  const secret = "test_secret";
  it("accepts only the documented order_id|payment_id HMAC", () => {
    const sig = createHmac("sha256", secret).update("order_ABC|pay_XYZ").digest("hex");
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: sig, keySecret: secret })).toBe(true);
    expect(verifyPaymentSignature({ orderId: "order_OTHER", paymentId: "pay_XYZ", signature: sig, keySecret: secret })).toBe(false);
    expect(verifyPaymentSignature({ orderId: "order_ABC", paymentId: "pay_XYZ", signature: "zz", keySecret: secret })).toBe(false);
  });
  it("verifies webhooks over the raw body", () => {
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", "wh").update(body).digest("hex");
    expect(verifyWebhookSignature(body, sig, "wh")).toBe(true);
    expect(verifyWebhookSignature(body.replace("captured", "failed"), sig, "wh")).toBe(false);
    expect(verifyWebhookSignature(body, null, "wh")).toBe(false);
  });
});

describe("launch checklist and logging", () => {
  it("lists missing credentials, policies, product data and label approvals", () => {
    setEnvForTesting({ NODE_ENV: "test" });
    const items = buildLaunchChecklist(getSeedContent(), getEnv(), { kind: "local", degraded: false });
    const todo = items.filter((i) => i.status === "todo").map((i) => i.id);
    expect(todo).toEqual(expect.arrayContaining(["nvidia-key", "supabase", "live-payments", "policy-shipping", "policy-terms", "cat-dark-head"]));
    expect(todo).toEqual(expect.arrayContaining(["prod_kmg_face_cream-inci", "prod_kmg_face_cream-usage", "prod_kmg_face_cream-claims"]));
    setEnvForTesting(undefined);
  });
  it("redacts credentials from log lines", () => {
    expect(redact("key nvapi-abcdefghijklmnop and rzp_live_ABCDEFGH and Bearer abc.def.ghi123")).not.toMatch(/nvapi-abc|rzp_live_ABC|abc\.def/);
  });
});
