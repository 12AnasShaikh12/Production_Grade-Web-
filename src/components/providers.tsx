"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { CartProvider } from "@/components/cart/cart-store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <CartProvider>{children}</CartProvider>
      </MotionConfig>
    </LazyMotion>
  );
}
