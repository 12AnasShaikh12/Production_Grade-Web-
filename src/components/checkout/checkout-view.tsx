"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-store";
import { OrderSummary } from "@/components/cart/cart-view";
import { useQuote, type Quote } from "@/components/cart/use-quote";
import { Button, ButtonLink, buttonClasses } from "@/components/ui/button";
import { Field, SelectField } from "@/components/ui/field";
import { Notice } from "@/components/ui/primitives";
import { addressSchema, INDIAN_STATES, type Address, type AddressInput } from "@/lib/checkout/address";
import { formatINR } from "@/lib/money";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void; on: (event: string, cb: (r: unknown) => void) => void };
  }
}

const EMPTY: AddressInput = { fullName: "", phone: "", email: "", line1: "", line2: "", landmark: "", city: "", state: "" as Address["state"], pincode: "" };

function loadRazorpay(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve(Boolean(window.Razorpay));
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function orderRequestMailto(quote: Quote, a: Address): string {
  const items = quote.lines.map((l) => `- ${l.name} × ${l.quantity} (${formatINR(l.lineTotalPaise)})`).join("\n");
  const body = `Hello Amros Beauty team,

I'd like to order:
${items}
Subtotal: ${formatINR(quote.subtotalPaise)} (shipping to be confirmed)

Delivery details:
${a.fullName}
${a.line1}${a.line2 ? `, ${a.line2}` : ""}${a.landmark ? ` (near ${a.landmark})` : ""}
${a.city}, ${a.state} ${a.pincode}
Phone: +91 ${a.phone}
Email: ${a.email}

Please confirm availability, shipping charges and how to pay. Thank you!`;
  return `mailto:${quote.contact.email}?subject=${encodeURIComponent("Order request — Amros Beauty")}&body=${encodeURIComponent(body)}`;
}

export function CheckoutView() {
  const { lines, hydrated, clear } = useCart();
  const { state, retry } = useQuote(lines, hydrated && lines.length > 0);
  const router = useRouter();
  const [form, setForm] = useState<AddressInput>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof AddressInput, string>>>({});
  const [phase, setPhase] = useState<"form" | "paying" | "request-ready">("form");
  const [message, setMessage] = useState<{ tone: "danger" | "info"; text: string } | null>(null);
  const [validated, setValidated] = useState<Address | null>(null);

  if (!hydrated || (lines.length > 0 && state.status === "loading")) return <div className="skeleton h-96" aria-hidden="true" />;
  if (lines.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-milk px-6 py-16 text-center">
        <h2 className="text-h3 text-ink">Your bag is empty</h2>
        <ButtonLink href="/shop" className="mt-6">
          Shop the collection
        </ButtonLink>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <Notice tone="danger" title="Checkout unavailable">
        {state.message}
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={retry}>
            Try again
          </Button>
        </div>
      </Notice>
    );
  }
  if (state.status !== "ready") return null;
  const { quote } = state;
  const live = quote.checkout.livePayments;

  const update = (field: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    const parsed = addressSchema.safeParse(form);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as keyof AddressInput] ??= issue.message;
      setErrors(next);
      document.getElementById(`field-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setValidated(parsed.data);
    if (!live) {
      setPhase("request-ready");
      return;
    }

    setPhase("paying");
    try {
      const res = await fetch("/api/checkout/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines, address: parsed.data }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "We couldn't start the payment.");
      if (!(await loadRazorpay()) || !window.Razorpay) throw new Error("The payment window couldn't load. Please check your connection.");
      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amountPaise,
        currency: data.currency,
        name: data.name,
        description: "Order payment",
        order_id: data.razorpayOrderId,
        prefill: data.prefill,
        theme: { color: "#2a2421" },
        modal: { ondismiss: () => setPhase("form") },
        handler: async (response: Record<string, string>) => {
          const verify = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderId, ...response }),
          });
          const result = await verify.json().catch(() => ({}));
          if (verify.ok) {
            clear();
            router.push(`/order/${data.orderId}`);
          } else {
            setPhase("form");
            setMessage({ tone: "danger", text: result.error ?? "We couldn't verify the payment. Please contact us." });
          }
        },
      });
      rzp.on("payment.failed", () => {
        setPhase("form");
        setMessage({ tone: "danger", text: "The payment didn't go through. No order was confirmed. You can try again." });
      });
      rzp.open();
    } catch (error) {
      setPhase("form");
      setMessage({ tone: "danger", text: error instanceof Error ? error.message : "Something went wrong." });
    }
  };

  const field = (name: keyof AddressInput) => ({
    id: `field-${name}`,
    name,
    value: (form[name] as string) ?? "",
    onChange: update(name),
    error: errors[name],
  });

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div>
        {!live && (
          <div className="mb-8">
            <Notice tone="warning" title="Online payment isn't available yet">
              <ul className="list-disc space-y-1 pl-5">
                {quote.checkout.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p className="mt-3">
                You can still fill in your details below and send them to our team by email. No payment will be taken and no order is placed until our
                team confirms with you.
              </p>
            </Notice>
          </div>
        )}

        <form noValidate onSubmit={submit} aria-labelledby="delivery-heading" className="space-y-6">
          <h2 id="delivery-heading" className="font-display text-h3 text-ink">
            Delivery details
          </h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" autoComplete="name" required maxLength={80} {...field("fullName")} />
            <Field
              label="Mobile number"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              required
              maxLength={16}
              hint="10-digit Indian mobile number"
              {...field("phone")}
            />
          </div>
          <Field label="Email" type="email" autoComplete="email" required maxLength={120} {...field("email")} />
          <Field label="Address line 1" autoComplete="address-line1" required maxLength={120} hint="House / flat number, building, street" {...field("line1")} />
          <Field label="Address line 2 (optional)" autoComplete="address-line2" maxLength={120} {...field("line2")} />
          <Field label="Landmark (optional)" maxLength={80} {...field("landmark")} />
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="City" autoComplete="address-level2" required maxLength={60} {...field("city")} />
            <SelectField label="State / UT" autoComplete="address-level1" required {...field("state")}>
              <option value="">Select…</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </SelectField>
            <Field label="PIN code" inputMode="numeric" autoComplete="postal-code" required maxLength={6} {...field("pincode")} />
          </div>

          {message && (
            <p role="alert" className="text-sm font-medium text-danger">
              {message.text}
            </p>
          )}

          {live ? (
            <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={phase === "paying"}>
              {phase === "paying" ? "Opening secure payment…" : `Pay ${quote.totalPaise !== null ? formatINR(quote.totalPaise) : ""} securely`}
            </Button>
          ) : (
            <div className="space-y-3">
              <Button type="button" size="lg" disabled className="w-full sm:w-auto" aria-describedby="payment-disabled-note">
                Online payment unavailable
              </Button>
              <p id="payment-disabled-note" className="text-sm text-ink-soft">
                Check your details, then email them to our team to request this order.
              </p>
              <Button type="submit" variant="secondary" size="lg" className="w-full sm:w-auto">
                Review order request
              </Button>
            </div>
          )}
        </form>

        {phase === "request-ready" && validated && (
          <div className="mt-8 rounded-lg border border-line bg-milk p-6" role="status">
            <h3 className="font-display text-2xl text-ink">Your order request is ready</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              This opens your email app with your bag and delivery details filled in. Nothing has been ordered or paid yet — our team will reply to confirm
              availability, shipping and payment.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a href={orderRequestMailto(quote, validated)} className={buttonClasses("primary", "md")}>
                Email order request
              </a>
              <a href={`tel:${quote.contact.phoneE164}`} className={buttonClasses("ghost", "md")}>
                Call {quote.contact.phoneDisplay}
              </a>
            </div>
          </div>
        )}
      </div>

      <OrderSummary quote={quote}>
        <ul className="mt-6 space-y-2 border-t hairline pt-4 text-sm">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-4">
              <span className="text-ink-soft">
                {l.name} × {l.quantity}
              </span>
              <span className="text-ink">{formatINR(l.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
      </OrderSummary>
    </div>
  );
}
