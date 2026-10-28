"use client";

import { useEffect, useState } from "react";
import type { CartLine } from "@/lib/cart/cart";
import type { PricedCart } from "@/lib/checkout/pricing";

export interface Quote extends PricedCart {
  checkout: { livePayments: boolean; reasons: string[]; deliveryEstimate: string | null; pricesIncludeTax: boolean | null };
  contact: { email: string; phoneDisplay: string; phoneE164: string };
}

type State = { status: "loading" } | { status: "ready"; quote: Quote } | { status: "error"; message: string };

/** Fetches a server-authoritative quote whenever the cart lines change. */
export function useQuote(lines: CartLine[], enabled: boolean) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify(lines);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: JSON.parse(key) }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("quote failed");
        setState({ status: "ready", quote: (await res.json()) as Quote });
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        setState({ status: "error", message: "We couldn't load current prices. Please check your connection and try again." });
      }
    }, 150);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [key, enabled, attempt]);

  return { state, retry: () => setAttempt((a) => a + 1) };
}
