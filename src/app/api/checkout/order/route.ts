import { cookies } from "next/headers";
import { z } from "zod";
import { cartLinesSchema } from "@/lib/cart/cart";
import { addressSchema } from "@/lib/checkout/address";
import { priceCart } from "@/lib/checkout/pricing";
import { checkoutReadiness, isPincodeServiceable } from "@/lib/checkout/readiness";
import { getEnv } from "@/lib/config/env";
import { loadContent } from "@/lib/data/content";
import { HttpError, isSameOrigin, jsonError, readJsonBody } from "@/lib/http";
import { errorSummary, log } from "@/lib/log";
import { attachRazorpayOrder, createPendingOrder, newAccessToken, orderCookieName } from "@/lib/orders/orders";
import { createRazorpayOrder } from "@/lib/payments/razorpay";
import { clientKey, RateLimiter } from "@/lib/security/rate-limit";
import { getServiceClient } from "@/lib/supabase/service";

const bodySchema = z.object({ lines: cartLinesSchema.min(1), address: addressSchema }).strict();
let limiter: RateLimiter | undefined;

/**
 * Creates a pending order and a matching Razorpay order. Refuses unless every live-payment
 * prerequisite is met. Totals are recomputed from server product records.
 */
export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  if (!isSameOrigin(request)) return jsonError(403, "Cross-origin requests are not allowed.");
  limiter ??= new RateLimiter(env.rateLimit.formMax * 2, 10 * 60 * 1000);
  if (!limiter.check(`order:${clientKey(request.headers)}`).allowed) return jsonError(429, "Too many attempts. Please wait and try again.");

  const { content, degraded } = await loadContent();
  const readiness = checkoutReadiness(content, env);
  const db = getServiceClient();
  if (!readiness.livePayments || degraded || !db || !env.razorpay.keyId || !env.razorpay.keySecret) {
    return jsonError(503, "Online payment isn't available yet. Please contact us to place your order.");
  }

  let body: unknown;
  try {
    body = await readJsonBody(request, 16 * 1024);
  } catch (error) {
    return error instanceof HttpError ? jsonError(error.status, error.publicMessage) : jsonError(400, "Invalid request.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Please check your details.");

  const { address, lines } = parsed.data;
  if (!isPincodeServiceable(address.pincode, content.commerce.serviceablePincodePrefixes)) {
    return jsonError(422, "Sorry, we don't deliver to this PIN code yet. Please contact us for help.");
  }
  const cart = priceCart(content, lines);
  if (cart.issues.length > 0 || cart.lines.length === 0 || cart.totalPaise === null) {
    return jsonError(409, "Your bag changed. Please review it and try again.");
  }

  try {
    const { token, hash } = newAccessToken();
    const orderId = await createPendingOrder(db, { cart, address, accessTokenHash: hash });
    const rzp = await createRazorpayOrder(
      { keyId: env.razorpay.keyId, keySecret: env.razorpay.keySecret },
      { amountPaise: cart.totalPaise, receipt: orderId, notes: { order_id: orderId } },
    );
    await attachRazorpayOrder(db, orderId, rzp.id);

    (await cookies()).set(orderCookieName(orderId), token, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    log.info("checkout.order_created", { orderId });
    return Response.json(
      {
        orderId,
        razorpayOrderId: rzp.id,
        keyId: env.razorpay.keyId,
        amountPaise: cart.totalPaise,
        currency: "INR",
        name: content.brand.name,
        prefill: { name: address.fullName, email: address.email, contact: `+91${address.phone}` },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    log.error("checkout.order_failed", { error: errorSummary(error) });
    return jsonError(502, "We couldn't start the payment. No money has been taken. Please try again or contact us.");
  }
}
