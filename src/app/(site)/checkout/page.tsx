import type { Metadata } from "next";
import { CheckoutView } from "@/components/checkout/checkout-view";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default function CheckoutPage() {
  return (
    <section className="container-page py-12 sm:py-16" aria-labelledby="checkout-title">
      <p className="eyebrow">Checkout</p>
      <h1 id="checkout-title" className="mt-3 text-h1 text-ink">
        Checkout
      </h1>
      <div className="mt-10">
        <CheckoutView />
      </div>
    </section>
  );
}
