import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Address } from "@/lib/checkout/address";
import type { PricedCart } from "@/lib/checkout/pricing";

export type OrderStatus = "pending_payment" | "paid" | "failed" | "cancelled";

export interface OrderView {
  id: string;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
  customerName: string;
  shipTo: string;
  items: { name: string; quantity: number; unitPricePaise: number; lineTotalPaise: number }[];
}

export const orderCookieName = (orderId: string) => `amros_order_${orderId.replace(/-/g, "")}`;

export function newAccessToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function tokenMatches(token: string | undefined, hash: string): boolean {
  if (!token) return false;
  const a = Buffer.from(hashToken(token), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function createPendingOrder(
  db: SupabaseClient,
  input: { cart: PricedCart; address: Address; accessTokenHash: string },
): Promise<string> {
  const { cart, address } = input;
  if (cart.totalPaise === null || cart.shippingPaise === null) throw new Error("Cannot create an order without configured shipping");
  const { data, error } = await db.rpc("create_order", {
    p_order: {
      access_token_hash: input.accessTokenHash,
      customer: { name: address.fullName, email: address.email, phone: address.phone },
      shipping_address: address,
      subtotal_paise: cart.subtotalPaise,
      shipping_paise: cart.shippingPaise,
      total_paise: cart.totalPaise,
      currency: "INR",
    },
    p_items: cart.lines.map((l) => ({
      product_id: l.productId,
      product_name: l.name,
      unit_price_paise: l.unitPricePaise,
      quantity: l.quantity,
      line_total_paise: l.lineTotalPaise,
    })),
  });
  if (error || typeof data !== "string") throw new Error(`Order creation failed: ${error?.message ?? "no id returned"}`);
  return data;
}

export async function attachRazorpayOrder(db: SupabaseClient, orderId: string, razorpayOrderId: string) {
  const { error } = await db.from("orders").update({ razorpay_order_id: razorpayOrderId }).eq("id", orderId).eq("status", "pending_payment");
  if (error) throw new Error(`Could not attach payment order: ${error.message}`);
}

export async function getOrderPaymentRef(db: SupabaseClient, orderId: string) {
  const { data, error } = await db
    .from("orders")
    .select("id,status,total_paise,razorpay_order_id,access_token_hash")
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(`Order lookup failed: ${error.message}`);
  return data as { id: string; status: OrderStatus; total_paise: number; razorpay_order_id: string | null; access_token_hash: string } | null;
}

/** Marks an order paid exactly once; returns false if it was not pending. */
export async function markOrderPaid(db: SupabaseClient, input: { razorpayOrderId: string; paymentId: string; amountPaise?: number }) {
  let query = db
    .from("orders")
    .update({ status: "paid", razorpay_payment_id: input.paymentId, paid_at: new Date().toISOString() })
    .eq("razorpay_order_id", input.razorpayOrderId)
    .eq("status", "pending_payment");
  if (input.amountPaise !== undefined) query = query.eq("total_paise", input.amountPaise);
  const { data, error } = await query.select("id");
  if (error) throw new Error(`Could not mark order paid: ${error.message}`);
  return (data ?? []).length > 0;
}

/** Returns order details only to a visitor holding the order's access token. */
export async function getOrderForVisitor(db: SupabaseClient, orderId: string, token: string | undefined): Promise<OrderView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return null;
  const { data, error } = await db.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
  if (error || !data) return null;
  if (!tokenMatches(token, data.access_token_hash)) return null;
  const a = data.shipping_address as Address;
  return {
    id: data.id,
    status: data.status,
    createdAt: data.created_at,
    paidAt: data.paid_at,
    subtotalPaise: data.subtotal_paise,
    shippingPaise: data.shipping_paise,
    totalPaise: data.total_paise,
    customerName: a.fullName,
    shipTo: `${a.city}, ${a.state} ${a.pincode}`,
    items: (data.order_items as { product_name: string; quantity: number; unit_price_paise: number; line_total_paise: number }[]).map((i) => ({
      name: i.product_name,
      quantity: i.quantity,
      unitPricePaise: i.unit_price_paise,
      lineTotalPaise: i.line_total_paise,
    })),
  };
}
