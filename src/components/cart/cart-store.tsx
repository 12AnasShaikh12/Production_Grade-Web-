"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  addLine,
  parseStoredCart,
  removeLine,
  setLineQuantity,
  totalQuantity,
  type CartLine,
} from "@/lib/cart/cart";

const STORAGE_KEY = "amros.cart.v1";
const EMPTY: CartLine[] = [];

// A tiny external store over localStorage so the cart survives navigation, refresh and tabs.
let snapshot: CartLine[] | null = null;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  if (snapshot) return snapshot;
  try {
    snapshot = parseStoredCart(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    snapshot = [];
  }
  return snapshot;
}

function write(lines: CartLine[]) {
  snapshot = lines;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage may be unavailable (private mode); the in-memory cart still works for this tab.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      snapshot = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

interface CartApi {
  lines: CartLine[];
  count: number;
  hydrated: boolean;
  add: (productId: string, quantity: number, max: number) => void;
  setQuantity: (productId: string, quantity: number, max: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartApi | null>(null);

const subscribeNoop = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  const hydrated = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const add = useCallback((id: string, q: number, max: number) => write(addLine(read(), id, q, max)), []);
  const setQuantity = useCallback((id: string, q: number, max: number) => write(setLineQuantity(read(), id, q, max)), []);
  const remove = useCallback((id: string) => write(removeLine(read(), id)), []);
  const clear = useCallback(() => write([]), []);

  const value = useMemo(
    () => ({ lines, count: totalQuantity(lines), hydrated, add, setQuantity, remove, clear }),
    [lines, hydrated, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartApi {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
