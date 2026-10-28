import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

/**
 * Razorpay Standard Checkout, per Razorpay's documented flow:
 *  1. Server creates an order (POST /v1/orders, HTTP Basic auth with key id/secret, amount in paise).
 *  2. Browser opens Checkout with that order id.
 *  3. Server verifies HMAC-SHA256(order_id + "|" + payment_id, key_secret) === razorpay_signature,
 *     using the order id stored on our server (not the one echoed by the browser).
 *  4. Webhooks are verified with HMAC-SHA256(raw body, webhook_secret) === X-Razorpay-Signature.
 */

const RAZORPAY_API = "https://api.razorpay.com/v1";

const orderResponse = z.object({
  id: z.string().startsWith("order_"),
  amount: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

export async function createRazorpayOrder(
  creds: RazorpayCredentials,
  input: { amountPaise: number; receipt: string; notes?: Record<string, string> },
  fetchImpl: typeof fetch = fetch,
) {
  const res = await fetchImpl(`${RAZORPAY_API}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountPaise,
      currency: "INR",
      receipt: input.receipt.slice(0, 40),
      notes: input.notes ?? {},
    }),
    signal: AbortSignal.timeout(10_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay order creation failed (HTTP ${res.status})`);
  const parsed = orderResponse.parse(await res.json());
  if (parsed.amount !== input.amountPaise || parsed.currency !== "INR") throw new Error("Razorpay order amount mismatch");
  return parsed;
}

function safeEqualHex(expected: string, received: string): boolean {
  if (!/^[a-f0-9]+$/i.test(received)) return false;
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyPaymentSignature(input: { orderId: string; paymentId: string; signature: string; keySecret: string }): boolean {
  const expected = createHmac("sha256", input.keySecret).update(`${input.orderId}|${input.paymentId}`).digest("hex");
  return safeEqualHex(expected, input.signature);
}

export function verifyWebhookSignature(rawBody: string, signature: string | null, webhookSecret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}
