import { z } from "zod";
import { cartLinesSchema } from "@/lib/cart/cart";
import { priceCart } from "@/lib/checkout/pricing";
import { checkoutReadiness } from "@/lib/checkout/readiness";
import { getEnv } from "@/lib/config/env";
import { loadContent } from "@/lib/data/content";
import { HttpError, jsonError, readJsonBody } from "@/lib/http";

const bodySchema = z.object({ lines: cartLinesSchema }).strict();

/** Server-authoritative cart pricing. The client sends only product ids and quantities. */
export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    return error instanceof HttpError ? jsonError(error.status, error.publicMessage) : jsonError(400, "Invalid request.");
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, "Your bag contains invalid items.");

  const { content, degraded } = await loadContent();
  const cart = priceCart(content, parsed.data.lines);
  const readiness = checkoutReadiness(content, getEnv());
  return Response.json(
    {
      ...cart,
      checkout: {
        livePayments: readiness.livePayments && !degraded,
        reasons: degraded ? ["Our store is temporarily unable to take orders online."] : readiness.publicReasons,
        deliveryEstimate: content.commerce.deliveryEstimate,
        pricesIncludeTax: content.commerce.pricesIncludeTax,
      },
      contact: { email: content.brand.email, phoneDisplay: content.brand.phoneDisplay, phoneE164: content.brand.phoneE164 },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
