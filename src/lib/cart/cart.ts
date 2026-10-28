import { z } from "zod";

/** Cart lines hold only product ids and quantities. Prices always come from the server. */
export interface CartLine {
  productId: string;
  quantity: number;
}

export const DEFAULT_MAX_QUANTITY = 10;
export const MAX_CART_LINES = 20;

export const cartLineSchema = z.object({
  productId: z.string().min(1).max(64),
  quantity: z.int().min(1).max(50),
});

export const cartLinesSchema = z.array(cartLineSchema).max(MAX_CART_LINES);

/** Returns a valid quantity, or null for zero, negative, non-integer, non-numeric or excessive input. */
export function normalizeQuantity(value: unknown, max = DEFAULT_MAX_QUANTITY): number | null {
  const n = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}

export function addLine(lines: CartLine[], productId: string, quantity: number, max = DEFAULT_MAX_QUANTITY): CartLine[] {
  const q = normalizeQuantity(quantity, max);
  if (q === null) return lines;
  const existing = lines.find((l) => l.productId === productId);
  if (existing) {
    return lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(max, l.quantity + q) } : l));
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [...lines, { productId, quantity: q }];
}

export function setLineQuantity(lines: CartLine[], productId: string, quantity: number, max = DEFAULT_MAX_QUANTITY): CartLine[] {
  const q = normalizeQuantity(quantity, max);
  if (q === null) return lines;
  return lines.map((l) => (l.productId === productId ? { ...l, quantity: q } : l));
}

export function removeLine(lines: CartLine[], productId: string): CartLine[] {
  return lines.filter((l) => l.productId !== productId);
}

export function totalQuantity(lines: CartLine[]): number {
  return lines.reduce((s, l) => s + l.quantity, 0);
}

/** Parses untrusted persisted data; invalid entries are dropped, duplicates merged. */
export function parseStoredCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const merged: CartLine[] = [];
    for (const item of data) {
      const parsed = cartLineSchema.safeParse(item);
      if (parsed.success) {
        const found = merged.find((l) => l.productId === parsed.data.productId);
        if (found) found.quantity = Math.min(50, found.quantity + parsed.data.quantity);
        else merged.push({ ...parsed.data });
      }
    }
    return merged.slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}
