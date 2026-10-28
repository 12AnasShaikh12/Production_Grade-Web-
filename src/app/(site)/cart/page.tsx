import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = {
  title: "Your Bag",
  robots: { index: false },
};

export default function CartPage() {
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="cart-title">
      <p className="eyebrow">Bag</p>
      <h1 id="cart-title" className="mt-3 text-h1 text-ink">
        Your bag
      </h1>
      <div className="mt-10">
        <CartView />
      </div>
    </section>
  );
}
