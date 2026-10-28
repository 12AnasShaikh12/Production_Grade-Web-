/** All monetary values are integer paise. Never use floating-point rupees for arithmetic. */

const wholeRupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const withPaise = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function assertPaise(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid paise amount: ${value}`);
  }
  return value;
}

export function formatINR(paise: number): string {
  assertPaise(paise);
  return (paise % 100 === 0 ? wholeRupees : withPaise).format(paise / 100);
}

/** Decimal rupee string for structured data, e.g. 49900 → "499.00". */
export function paiseToDecimalString(paise: number): string {
  assertPaise(paise);
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  return `${rupees}.${rest.toString().padStart(2, "0")}`;
}

export function multiplyPaise(unitPaise: number, quantity: number): number {
  assertPaise(unitPaise);
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new RangeError(`Invalid quantity: ${quantity}`);
  return assertPaise(unitPaise * quantity);
}

export function sumPaise(values: number[]): number {
  return assertPaise(values.reduce((total, v) => total + assertPaise(v), 0));
}

/**
 * Perceived "MRP" / compare-at price shown struck-through next to the actual listed price so
 * customers see the discount they're getting. Applies a 50% markup to the listed paise amount
 * and rounds the result to a classic retail "₹X99" whole-rupee sticker (e.g. ₹1,199 → ₹1,799).
 *
 * This is a presentation-only value: the server never charges it, carts never price with it,
 * and it is excluded from the structured-data `offers.price`. Returns null when the markup
 * would collapse to the actual price (shouldn't happen for any live product but keeps the
 * caller safe against zero-rupee catalogues).
 */
export function compareAtPaise(pricePaise: number): number | null {
  assertPaise(pricePaise);
  if (pricePaise < 100) return null;
  const marked = Math.round(pricePaise * 1.5);
  // Round to nearest whole hundred rupees, then subtract 1 rupee so the display ends in "99".
  const rupees = Math.round(marked / 100);
  const bucket = Math.round(rupees / 100) * 100;
  const compare = (bucket - 1) * 100;
  return compare > pricePaise ? compare : null;
}

/** Integer percent discount from `compareAt` to `price`, floored. 0 when inputs don't discount. */
export function discountPercent(pricePaise: number, compareAtPaise: number): number {
  assertPaise(pricePaise);
  assertPaise(compareAtPaise);
  if (compareAtPaise <= pricePaise) return 0;
  return Math.floor(((compareAtPaise - pricePaise) / compareAtPaise) * 100);
}
