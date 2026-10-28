import type { CartLine } from "@/lib/cart/cart";
import type { SiteContent } from "@/lib/content/schemas";
import { getProductById, isPurchasable } from "@/lib/content/selectors";
import { multiplyPaise, sumPaise } from "@/lib/money";

export interface PricedLine {
  productId: string;
  slug: string;
  name: string;
  image: { src: string; alt: string } | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface CartIssue {
  productId: string;
  message: string;
}

export interface PricedCart {
  lines: PricedLine[];
  issues: CartIssue[];
  subtotalPaise: number;
  /** Null when shipping has not been configured — the order total cannot be finalised. */
  shippingPaise: number | null;
  totalPaise: number | null;
  currency: "INR";
  maxQuantityPerLine: number;
}

/**
 * Prices a cart exclusively from server-side product records. Client-supplied prices are never
 * accepted; unknown, inactive or unavailable products are dropped with an explanatory issue.
 */
export function priceCart(content: SiteContent, input: CartLine[]): PricedCart {
  const max = content.commerce.maxQuantityPerLine;
  const lines: PricedLine[] = [];
  const issues: CartIssue[] = [];

  for (const item of input) {
    const product = getProductById(content, item.productId);
    if (!product) {
      issues.push({ productId: item.productId, message: "This item is no longer available and was removed." });
      continue;
    }
    if (!isPurchasable(product)) {
      issues.push({ productId: item.productId, message: `${product.shortName} is currently unavailable.` });
      continue;
    }
    let quantity = item.quantity;
    if (quantity > max) {
      quantity = max;
      issues.push({ productId: item.productId, message: `The maximum quantity per order is ${max}.` });
    }
    const image = product.images[0];
    lines.push({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: image ? { src: image.src, alt: image.alt } : null,
      unitPricePaise: product.pricePaise,
      quantity,
      lineTotalPaise: multiplyPaise(product.pricePaise, quantity),
    });
  }

  const subtotalPaise = sumPaise(lines.map((l) => l.lineTotalPaise));
  const c = content.commerce;
  let shippingPaise: number | null = null;
  if (c.shippingFeePaise !== null) {
    shippingPaise =
      c.freeShippingThresholdPaise !== null && subtotalPaise >= c.freeShippingThresholdPaise ? 0 : c.shippingFeePaise;
  }
  return {
    lines,
    issues,
    subtotalPaise,
    shippingPaise,
    totalPaise: shippingPaise === null ? null : sumPaise([subtotalPaise, shippingPaise]),
    currency: "INR",
    maxQuantityPerLine: max,
  };
}
