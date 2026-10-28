import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { formatINR } from "@/lib/money";
import { getOrderForVisitor, orderCookieName } from "@/lib/orders/orders";
import { getServiceClient } from "@/lib/supabase/service";

export const metadata: Metadata = {
  title: "Your order",
  robots: { index: false, follow: false },
};

export default function OrderPage({ params }: PageProps<"/order/[id]">) {
  return (
    <section className="container-page max-w-3xl py-14 sm:py-20">
      <Suspense fallback={<div className="skeleton h-80" aria-hidden="true" />}>
        <OrderDetails params={params} />
      </Suspense>
    </section>
  );
}

async function OrderDetails({ params }: { params: PageProps<"/order/[id]">["params"] }) {
  const { id } = await params;
  const db = getServiceClient();
  const token = (await cookies()).get(orderCookieName(id))?.value;
  // Order details are shown only to the browser that placed the order (httpOnly access token).
  const order = db ? await getOrderForVisitor(db, id, token) : null;

  if (!order) {
    return (
      <div className="text-center">
        <p className="eyebrow">Order</p>
        <h1 className="mt-4 text-h1 text-ink">We couldn&apos;t find this order</h1>
        <p className="mx-auto mt-4 max-w-md text-ink-soft">
          Order details can only be viewed from the browser used to place the order. If you need help, please contact our team with your order reference.
        </p>
        <ButtonLink href="/contact" className="mt-8">
          Contact us
        </ButtonLink>
      </div>
    );
  }

  const paid = order.status === "paid";
  return (
    <div>
      <p className="eyebrow">Order {order.id.slice(0, 8).toUpperCase()}</p>
      <h1 className="mt-4 text-h1 text-ink">{paid ? `Thank you, ${order.customerName.split(" ")[0]}` : "Payment not confirmed yet"}</h1>
      <div className="mt-6">
        {paid ? (
          <Notice tone="success" title="Payment received and verified">
            Your order is confirmed. Our team will be in touch about delivery to {order.shipTo}.
          </Notice>
        ) : (
          <Notice tone="warning" title="We haven't received a verified payment for this order">
            If money was deducted, it may take a few minutes to confirm. Please refresh shortly, or contact us with your order reference.
          </Notice>
        )}
      </div>
      <ul className="mt-10 divide-y divide-line border-y hairline">
        {order.items.map((i) => (
          <li key={i.name} className="flex justify-between gap-4 py-4 text-sm">
            <span className="text-ink">
              {i.name} × {i.quantity}
            </span>
            <span className="font-semibold text-ink">{formatINR(i.lineTotalPaise)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-ink-soft">Subtotal</dt>
          <dd>{formatINR(order.subtotalPaise)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-ink-soft">Shipping</dt>
          <dd>{order.shippingPaise === 0 ? "Free" : formatINR(order.shippingPaise)}</dd>
        </div>
        <div className="flex justify-between text-base font-semibold">
          <dt>Total</dt>
          <dd>{formatINR(order.totalPaise)}</dd>
        </div>
      </dl>
    </div>
  );
}
