"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-store";
import { buttonClasses } from "@/components/ui/button";
import { QuantitySelector } from "@/components/ui/quantity-selector";

export function QuickAddButton({ productId, productName, max, purchasable }: { productId: string; productName: string; max: number; purchasable: boolean }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  if (!purchasable) {
    return (
      <button type="button" disabled className={buttonClasses("ghost", "sm")}>
        Unavailable
      </button>
    );
  }
  return (
    <button
      type="button"
      className={buttonClasses(added ? "secondary" : "primary", "sm", "min-w-32")}
      aria-label={`Add ${productName} to bag`}
      onClick={() => {
        add(productId, 1, max);
        setAdded(true);
      }}
    >
      <span aria-live="polite">{added ? "Added ✓" : "Add to bag"}</span>
    </button>
  );
}

export function ProductPurchase({
  productId,
  productName,
  max,
  purchasable,
}: {
  productId: string;
  productName: string;
  max: number;
  purchasable: boolean;
}) {
  const { add } = useCart();
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [status, setStatus] = useState<"idle" | "added">("idle");

  if (!purchasable) {
    return (
      <p className="rounded-md border border-line bg-pearl px-5 py-4 text-sm text-ink-soft" role="status">
        This product is currently unavailable to order. Please contact us for availability.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <QuantitySelector value={quantity} onChange={setQuantity} max={max} />
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          className={buttonClasses("primary", "lg", "flex-1")}
          onClick={() => {
            add(productId, quantity, max);
            setStatus("added");
          }}
        >
          Add to bag
        </button>
        <button
          type="button"
          className={buttonClasses("secondary", "lg", "flex-1")}
          onClick={() => {
            add(productId, quantity, max);
            router.push("/checkout");
          }}
        >
          Buy now
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-success">
        {status === "added" && (
          <>
            {quantity} × {productName} added to your bag.{" "}
            <Link href="/cart" className="font-semibold underline underline-offset-4">
              View bag
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
