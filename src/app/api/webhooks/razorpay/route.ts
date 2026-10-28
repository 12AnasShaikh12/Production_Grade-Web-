import { z } from "zod";
import { getEnv } from "@/lib/config/env";
import { errorSummary, log } from "@/lib/log";
import { markOrderPaid } from "@/lib/orders/orders";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { getServiceClient } from "@/lib/supabase/service";

const paymentEntity = z.object({ id: z.string(), order_id: z.string().nullable().optional(), amount: z.number().int(), status: z.string() });
const eventSchema = z.object({
  event: z.string(),
  payload: z.object({ payment: z.object({ entity: paymentEntity }).optional() }).passthrough(),
});

/** Razorpay webhook: signature verified over the raw body; idempotent by event id. */
export async function POST(request: Request): Promise<Response> {
  const env = getEnv();
  const db = getServiceClient();
  if (!env.razorpay.webhookSecret || !db) return new Response("Not configured", { status: 503 });

  const raw = await request.text();
  if (raw.length > 256 * 1024) return new Response("Too large", { status: 413 });
  if (!verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"), env.razorpay.webhookSecret)) {
    log.warn("webhook.signature_invalid");
    return new Response("Invalid signature", { status: 400 });
  }

  let event: z.infer<typeof eventSchema>;
  try {
    event = eventSchema.parse(JSON.parse(raw));
  } catch {
    return new Response("Malformed payload", { status: 400 });
  }

  const eventId = request.headers.get("x-razorpay-event-id");
  try {
    if (eventId) {
      const { error } = await db.from("payment_events").insert({ id: eventId, event: event.event, received_at: new Date().toISOString() });
      if (error?.code === "23505") return Response.json({ ok: true, duplicate: true });
      if (error) throw new Error(error.message);
    }
    const payment = event.payload.payment?.entity;
    if ((event.event === "payment.captured" || event.event === "order.paid") && payment?.order_id && payment.status === "captured") {
      const updated = await markOrderPaid(db, { razorpayOrderId: payment.order_id, paymentId: payment.id, amountPaise: payment.amount });
      log.info("webhook.payment_captured", { updated });
    }
    return Response.json({ ok: true });
  } catch (error) {
    log.error("webhook.failed", { error: errorSummary(error) });
    return new Response("Error", { status: 500 });
  }
}
