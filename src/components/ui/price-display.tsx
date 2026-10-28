import { compareAtPaise, discountPercent, formatINR } from "@/lib/money";

/**
 * Shows the actual listed price next to a strike-through compare-at ("MRP") and a small
 * discount badge. The compare-at is a presentation-only value (see `compareAtPaise`).
 *
 * Sizes:
 *  - "sm" → product-card footer / cart-line unit price (compact row)
 *  - "md" → cart item line, order summary line (default)
 *  - "lg" → product page hero price, home hero CTA
 */
export function PriceDisplay({
  pricePaise,
  size = "md",
  align = "start",
  showBadge = true,
  className = "",
}: {
  pricePaise: number;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
  showBadge?: boolean;
  className?: string;
}) {
  const compare = compareAtPaise(pricePaise);
  const percent = compare ? discountPercent(pricePaise, compare) : 0;

  const priceClass = size === "lg" ? "text-2xl font-semibold" : size === "sm" ? "text-base font-semibold" : "text-lg font-semibold";
  const compareClass = size === "lg" ? "text-base" : "text-sm";
  const badgeClass =
    size === "lg"
      ? "rounded-full bg-blush/60 px-2.5 py-1 text-xs font-semibold text-blush-deep"
      : "rounded-full bg-blush/60 px-2 py-0.5 text-[0.68rem] font-semibold text-blush-deep";

  return (
    <p className={`flex flex-wrap items-baseline gap-x-2 gap-y-1 text-ink ${align === "end" ? "justify-end" : ""} ${className}`}>
      <span className="sr-only">Price: </span>
      <span className={priceClass}>{formatINR(pricePaise)}</span>
      {compare && (
        <>
          <span className={`text-ink-muted line-through ${compareClass}`} aria-label={`MRP ${formatINR(compare)}`}>
            {formatINR(compare)}
          </span>
          {showBadge && percent > 0 && (
            <span className={badgeClass} aria-label={`${percent} percent off`}>
              {percent}% OFF
            </span>
          )}
        </>
      )}
    </p>
  );
}
