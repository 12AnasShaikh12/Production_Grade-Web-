import type { ServerEnv } from "@/lib/config/env";
import type { SiteContent } from "@/lib/content/schemas";

export interface CheckoutReadiness {
  livePayments: boolean;
  /** Customer-safe explanations (no credential names). */
  publicReasons: string[];
  /** Admin-facing detail for the launch checklist. */
  adminReasons: string[];
}

/**
 * Live payments are enabled only when every prerequisite is satisfied. Anything missing keeps
 * checkout in "contact to purchase" mode — no pretend payments, no fake orders.
 */
export function checkoutReadiness(content: SiteContent, env: Pick<ServerEnv, "razorpay" | "supabase">): CheckoutReadiness {
  const admin: string[] = [];
  const pub = new Set<string>();

  if (!env.razorpay.configured) {
    admin.push("Razorpay API keys are not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
    pub.add("Online payment is not set up yet.");
  }
  if (!env.razorpay.webhookConfigured) admin.push("Razorpay webhook secret is not configured (RAZORPAY_WEBHOOK_SECRET).");
  if (!env.razorpay.livePaymentsFlag) {
    admin.push("CHECKOUT_LIVE_PAYMENTS is not enabled in the server environment.");
    pub.add("Online payment is not set up yet.");
  }
  if (!env.supabase.configured) {
    admin.push("Order storage requires Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).");
    pub.add("Online payment is not set up yet.");
  }
  if (!content.commerce.checkoutEnabled) {
    admin.push("Checkout is switched off in Admin → Store settings.");
    pub.add("Online ordering has not opened yet.");
  }
  if (content.commerce.shippingFeePaise === null) {
    admin.push("Shipping fee is not configured.");
    pub.add("Shipping charges are still being confirmed.");
  }
  if (content.commerce.serviceablePincodePrefixes === null) {
    admin.push("Serviceable PIN codes are not configured.");
    pub.add("Delivery areas are still being confirmed.");
  }
  if (content.commerce.pricesIncludeTax === null) admin.push("Tax treatment of listed prices (GST inclusive or not) is not confirmed.");
  for (const slug of ["shipping", "returns", "privacy", "terms"] as const) {
    const p = content.policies.find((x) => x.slug === slug);
    if (!p || p.status !== "approved" || !p.body) {
      admin.push(`The ${p?.title ?? slug} policy has not been approved and published.`);
      pub.add("Store policies are still being finalised.");
    }
  }
  return {
    livePayments: admin.length === 0,
    publicReasons: [...pub],
    adminReasons: admin,
  };
}

export function isPincodeServiceable(pincode: string, prefixes: string[] | null): boolean {
  if (prefixes === null) return false;
  if (prefixes.length === 0) return true;
  return prefixes.some((p) => pincode.startsWith(p));
}
