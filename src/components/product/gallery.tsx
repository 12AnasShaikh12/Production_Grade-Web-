"use client";

import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import type { ProductImage as ProductImageType } from "@/lib/content/schemas";
import { ProductImage } from "./product-image";

export function Gallery({ images, productName }: { images: ProductImageType[]; productName: string }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-lg border border-line bg-pearl">
        <AnimatePresence mode="wait" initial={false}>
          <m.div key={current.src} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
            <ProductImage
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              priority={active === 0}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] h-auto w-full object-cover"
            />
          </m.div>
        </AnimatePresence>
      </div>
      {images.length > 1 && (
        <div role="group" aria-label={`${productName} images`} className="grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-pressed={i === active}
              className={`overflow-hidden rounded-md border-2 transition-colors ${i === active ? "border-ink" : "border-transparent hover:border-line"}`}
            >
              <ProductImage src={img.src} alt="" width={img.width} height={img.height} sizes="120px" className="aspect-[4/5] h-auto w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
