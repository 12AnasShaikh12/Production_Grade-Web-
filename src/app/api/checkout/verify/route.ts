import { cookies } from "next/headers";
import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { HttpError, isSameOrigin, jsonError, readJsonBody } from "@/lib/http";
import { errorSummary, log } from "@/lib/log";
import { getOrderPaymentRef, hashToken, markOrderPaid, orderCookieName } from "@/lib/orders/orders";
import { verifyPaymentSignature } from "@/lib/payments/razorpay";
import { getServiceClient } from "@/lib/supabase/service";

const bodySchema = z
  .object({
    orderId: z.uuid(),
    razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/),
    razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/),
    razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i),
  })
  .strict();

/** Verifies the Checkout signature server-side before an order is ever shown as paid. */
export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin requests are not allowed.");
  const db = getServiceClient();
  if (!db || !env.razorpay.keySecret) return jsonError(503, "Payment verification is unavailable.");

  let body: unknown;
  try {
    body = await readJsonBody(request, 4 * 1024);
  } catch (error) {
    return error instanceof HttpError ? jsonError(error.status, error.publicMessage) : jsonError(400, "Invalid request.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Invalid payment confirmation.");
  const p = parsed.data;

  try {
    const order = await getOrderPaymentRef(db, p.orderId);
    const token = (await cookies()).get(orderCookieName(p.orderId))?.value;
    if (!order || !token || hashToken(token) !== order.access_token_hash || !order.razorpay_order_id) {
      return jsonError(404, "Order not found.");
    }
    // Use the Razorpay order id we stored, never the one echoed back by the browser.
    const valid = verifyPaymentSignature({
      orderId: order.razorpay_order_id,
      paymentId: p.razorpay_payment_id,
      signature: p.razorpay_signature,
      keySecret: env.razorpay.keySecret,
    });
    if (!valid || p.razorpay_order_id !== order.razorpay_order_id) {
      log.warn("checkout.signature_invalid", { orderId: p.orderId });
      return jsonError(400, "We couldn't verify this payment. If money was deducted, please contact us with your order reference.");
    }
    if (order.status !== "paid") {
      await markOrderPaid(db, { razorpayOrderId: order.razorpay_order_id, paymentId: p.razorpay_payment_id });
    }
    return Response.json({ ok: true, orderId: p.orderId }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    log.error("checkout.verify_failed", { error: errorSummary(error) });
    return jsonError(502, "We couldn't confirm your payment yet. Please contact us with your order reference.");
  }
}
