import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setEnvForTesting } from "@/lib/config/env";
import { SeedRepository, setRepositoryForTesting } from "@/lib/data/repositories";

// Route handlers are exercised directly with Web Request objects; no NVIDIA, database or payment
// credentials are configured, mirroring a fresh deployment.
beforeAll(() => {
  setEnvForTesting({ NODE_ENV: "test", CHAT_RATE_LIMIT_MAX: "4", CHAT_RATE_LIMIT_WINDOW_SECONDS: "60" });
  setRepositoryForTesting(new SeedRepository());
});
afterAll(() => {
  setEnvForTesting(undefined);
  setRepositoryForTesting(undefined);
});

const json = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(url, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.1", ...headers }, body: JSON.stringify(body) });

describe("POST /api/chat", () => {
  it("answers deterministically without an NVIDIA key and exposes no internals", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const res = await POST(json("http://localhost/api/chat", { message: "What is the price?" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.answer).toContain("₹1,199");
    expect(data.mode).toBe("fallback");
    expect(Object.keys(data).sort()).toEqual(["answer", "mode", "sources", "unverified"]);
  });

  it("validates content type, JSON, size, schema and origin", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const ip = { "x-forwarded-for": "10.0.0.2" };
    expect((await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "text/plain", ...ip }, body: "hi" }))).status).toBe(415);
    expect((await POST(new Request("http://localhost/api/chat", { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "10.0.0.3" }, body: "{oops" }))).status).toBe(400);
    expect((await POST(json("http://localhost/api/chat", { message: "x".repeat(20_000) }, { "x-forwarded-for": "10.0.0.4" }))).status).toBe(413);
    const tooLong = await POST(json("http://localhost/api/chat", { message: "x".repeat(600) }, { "x-forwarded-for": "10.0.0.5" }));
    expect(tooLong.status).toBe(400);
    expect((await tooLong.json()).error).toMatch(/under 500 characters/);
    expect((await POST(json("http://localhost/api/chat", { message: "hi" }, { origin: "https://evil.example", "x-forwarded-for": "10.0.0.6" }))).status).toBe(403);
  });

  it("rate-limits repeated requests", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) statuses.push((await POST(json("http://localhost/api/chat", { message: "hello" }, { "x-forwarded-for": "10.9.9.9" }))).status);
    expect(statuses.slice(0, 4)).toEqual([200, 200, 200, 200]);
    expect(statuses[4]).toBe(429);
  });
});

describe("POST /api/cart/quote", () => {
  it("prices from the server and ignores client-supplied prices", async () => {
    const { POST } = await import("@/app/api/cart/quote/route");
    const res = await POST(json("http://localhost/api/cart/quote", { lines: [{ productId: "prod_kmg_face_cream", quantity: 2, pricePaise: 1 }] }));
    const data = await res.json();
    expect(data.lines[0].unitPricePaise).toBe(119900);
    expect(data.subtotalPaise).toBe(239800);
    expect(data.checkout.livePayments).toBe(false);
    expect(data.totalPaise).toBeNull();
  });
  it("rejects malformed cart lines", async () => {
    const { POST } = await import("@/app/api/cart/quote/route");
    expect((await POST(json("http://localhost/api/cart/quote", { lines: [{ productId: "x", quantity: 0 }] }))).status).toBe(400);
    expect((await POST(json("http://localhost/api/cart/quote", { lines: [], extra: 1 }))).status).toBe(400);
  });
});

describe("checkout endpoints without payment configuration", () => {
  it("refuses to create orders (no fake orders)", async () => {
    const { POST } = await import("@/app/api/checkout/order/route");
    const res = await POST(
      json("http://localhost/api/checkout/order", {
        lines: [{ productId: "prod_kmg_face_cream", quantity: 1 }],
        address: { fullName: "A B", phone: "9876543210", email: "a@b.co", line1: "1 Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      }),
    );
    expect(res.status).toBe(503);
  });
  it("refuses payment verification and webhooks when unconfigured", async () => {
    const verify = (await import("@/app/api/checkout/verify/route")).POST;
    expect((await verify(json("http://localhost/api/checkout/verify", {}))).status).toBe(503);
    const webhook = (await import("@/app/api/webhooks/razorpay/route")).POST;
    expect((await webhook(json("http://localhost/api/webhooks/razorpay", {}))).status).toBe(503);
  });
  it("contact API discloses that delivery is not configured", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(json("http://localhost/api/contact", { name: "A", email: "a@b.co", message: "Hello there team" }));
    expect(res.status).toBe(503);
  });
});
