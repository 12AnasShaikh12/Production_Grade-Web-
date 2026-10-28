"use client";

import { AnimatePresence, m } from "motion/react";
import { useId, useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/button";

export interface SkinTypeOption {
  id: string;
  label: string;
  description: string;
  productCount: number;
}

/** WAI-ARIA tabs: arrow keys move between skin types; each panel links to the filtered shop. */
export function SkinTypeSelector({ options, productShortName }: { options: SkinTypeOption[]; productShortName: string }) {
  const [active, setActive] = useState(0);
  const baseId = useId();
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options[active];

  const move = (delta: number) => {
    const next = (active + delta + options.length) % options.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <section className="border-y hairline bg-pearl/50 py-[var(--spacing-section)]" aria-labelledby={`${baseId}-heading`}>
      <div className="container-page grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Skin-type guide</p>
          <h2 id={`${baseId}-heading`} className="mt-4 text-h2 text-ink">
            Choose your skin type
          </h2>
          <p className="mt-5 max-w-md leading-relaxed text-ink-soft">
            {productShortName} is positioned for dry and sensitive skin. This guide helps you browse — it can&apos;t diagnose your skin. If you&apos;re
            unsure, a dermatologist can help.
          </p>
          <div role="tablist" aria-label="Skin type" className="mt-8 inline-flex rounded-full border border-line bg-milk p-1.5">
            {options.map((o, i) => (
              <button
                key={o.id}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`${baseId}-tab-${o.id}`}
                aria-selected={i === active}
                aria-controls={`${baseId}-panel`}
                tabIndex={i === active ? 0 : -1}
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowRight") move(1);
                  if (e.key === "ArrowLeft") move(-1);
                }}
                className={`relative min-h-11 rounded-full px-6 text-sm font-semibold transition-colors ${i === active ? "text-milk" : "text-ink-soft hover:text-ink"}`}
              >
                {i === active && (
                  <m.span layoutId={`${baseId}-pill`} className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
                )}
                <span className="relative">{o.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${current.id}`} className="relative min-h-72 rounded-lg border border-line bg-milk p-8 shadow-soft sm:p-10">
          <AnimatePresence mode="wait">
            <m.div key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <h3 className="font-display text-h3 text-ink">{current.label}</h3>
              <p className="mt-4 leading-relaxed text-ink-soft">{current.description}</p>
              <p className="mt-4 text-sm text-ink-muted">
                Always patch-test a new product and stop using it if irritation occurs. Individual responses vary.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <ButtonLink href={`/shop?skin=${current.id}`}>
                  Shop for {current.label.toLowerCase()} ({current.productCount})
                </ButtonLink>
                <ButtonLink href="/skin-guide" variant="quiet">
                  Read the skin guide
                </ButtonLink>
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
