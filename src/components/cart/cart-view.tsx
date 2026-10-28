"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-store";
import { useQuote } from "@/components/cart/use-quote";
import { ProductImage } from "@/components/product/product-image";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { QuantitySelector } from "@/components/ui/quantity-selector";
import { compareAtPaise, formatINR, multiplyPaise } from "@/lib/money";

export function CartView() {
  const { lines, hydrated, setQuantity, remove } = useCart();
  const { state, retry } = useQuote(lines, hydrated && lines.length > 0);

  // Drop items the server says no longer exist so the bag stays consistent.
  useEffect(() => {
    if (state.status !== "ready") return;
    const priced = new Set(state.quote.lines.map((l) => l.productId));
    for (const issue of state.quote.issues) if (!priced.has(issue.productId)) remove(issue.productId);
  }, [state, remove]);

  if (!hydrated) return <CartSkeleton />;

  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-milk px-6 py-20 text-center">
        <p className="eyebrow">Your bag is empty</p>
        <h2 className="mt-4 text-h2 text-ink">Nothing here yet</h2>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">Discover KMG — our Korean-beauty-inspired face cream for a Milky Glassy Glow ritual.</p>
        <ButtonLink href="/shop" className="mt-8">
          Shop the collection
        </ButtonLink>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Notice tone="danger" title="Prices unavailable">
        {state.message}
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      </Notice>
    );
  }
  if (state.status === "loading") return <CartSkeleton />;

  const { quote } = state;
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {quote.issues.length > 0 && (
          <div className="mb-6">
            <Notice tone="warning">
              <ul className="space-y-1">
                {quote.issues.map((i) => (
                  <li key={i.productId + i.message}>{i.message}</li>
                ))}
              </ul>
            </Notice>
          </div>
        )}
        <ul className="divide-y divide-line border-y hairline" aria-label="Items in your bag">
          {quote.lines.map((line) => (
            <li key={line.productId} className="grid grid-cols-[5.5rem_1fr] gap-5 py-6 sm:grid-cols-[7rem_1fr]">
              <Link href={`/products/${line.slug}`} className="overflow-hidden rounded-md bg-pearl" tabIndex={-1} aria-hidden="true">
                {line.image && <ProductImage src={line.image.src} alt="" width={800} height={1000} sizes="112px" className="aspect-[4/5] h-auto w-full object-cover" />}
              </Link>
              <div className="flex flex-col gap-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link href={`/products/${line.slug}`} className="font-display text-xl leading-tight text-ink hover:text-blush-deep">
                      {line.name}
                    </Link>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatINR(line.unitPricePaise)} each
                      {(() => {
                        const c = compareAtPaise(line.unitPricePaise);
                        return c ? <span className="ml-2 text-ink-muted/70 line-through">{formatINR(c)}</span> : null;
                      })()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-ink">{formatINR(line.lineTotalPaise)}</p>
                    {(() => {
                      const c = compareAtPaise(line.unitPricePaise);
                      return c ? (
                        <p className="text-xs text-ink-muted line-through">{formatINR(multiplyPaise(c, line.quantity))}</p>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <QuantitySelector
                    compact
                    label={`Quantity for ${line.name}`}
                    value={line.quantity}
                    max={quote.maxQuantityPerLine}
                    onChange={(q) => setQuantity(line.productId, q, quote.maxQuantityPerLine)}
                  />
                  <button type="button" onClick={() => remove(line.productId)} className="text-sm font-semibold text-ink-soft underline-offset-4 hover:text-danger hover:underline">
                    Remove<span className="sr-only"> {line.name}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <OrderSummary quote={quote}>
        <ButtonLink href="/checkout" size="lg" className="mt-6 w-full">
          Continue to checkout
        </ButtonLink>
        <ButtonLink href="/shop" variant="quiet" className="mt-2 w-full">
          Continue shopping
        </ButtonLink>
      </OrderSummary>
    </div>
  );
}

export function OrderSummary({ quote, children }: { quote: import("./use-quote").Quote; children?: React.ReactNode }) {
  // Sum the compare-at (MRP) across all lines so the subtotal can show the savings.
  const compareSubtotal = quote.lines.reduce((total, l) => {
    const c = compareAtPaise(l.unitPricePaise);
    return total + (c ? multiplyPaise(c, l.quantity) : l.lineTotalPaise);
  }, 0);
  const savings = Math.max(0, compareSubtotal - quote.subtotalPaise);
  return (
    <aside aria-label="Order summary" className="h-fit rounded-lg border border-line bg-milk p-6 lg:sticky lg:top-24">
      <h2 className="font-display text-2xl text-ink">Order summary</h2>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Subtotal ({quote.lines.reduce((s, l) => s + l.quantity, 0)} items)</dt>
          <dd className="text-right">
            <span className="font-semibold text-ink">{formatINR(quote.subtotalPaise)}</span>
            {savings > 0 && <span className="ml-2 text-ink-muted line-through">{formatINR(compareSubtotal)}</span>}
          </dd>
        </div>
        {savings > 0 && (
          <div className="flex justify-between gap-4">
            <dt className="text-ink-soft">You save</dt>
            <dd className="font-semibold text-blush-deep">− {formatINR(savings)}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-ink-soft">Shipping</dt>
          <dd className="text-right text-ink">
            {quote.shippingPaise === null ? "To be confirmed" : quote.shippingPaise === 0 ? "Free" : formatINR(quote.shippingPaise)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t hairline pt-3 text-base">
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="font-semibold text-ink">{quote.totalPaise === null ? `${formatINR(quote.subtotalPaise)} + shipping` : formatINR(quote.totalPaise)}</dd>
        </div>
      </dl>
      {quote.checkout.pricesIncludeTax !== null && (
        <p className="mt-3 text-xs text-ink-muted">{quote.checkout.pricesIncludeTax ? "Prices include applicable taxes." : "Applicable taxes are added at payment."}</p>
      )}
      {quote.checkout.deliveryEstimate && <p className="mt-2 text-xs text-ink-muted">Estimated delivery: {quote.checkout.deliveryEstimate}.</p>}
      <p className="mt-3 text-xs text-ink-muted">Prices are confirmed by our server and shown in Indian Rupees.</p>
      {children}
    </aside>
  );
}

function CartSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]" aria-hidden="true">
      <div className="space-y-6">
        {[0, 1].map((i) => (
          <div key={i} className="flex gap-5">
            <div className="skeleton h-32 w-24" />
            <div className="flex-1 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-11 w-36 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="skeleton h-64" />
    </div>
  );
}
