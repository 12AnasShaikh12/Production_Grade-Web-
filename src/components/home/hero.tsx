"use client";

import { m, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import { useRef } from "react";
import { ButtonLink } from "@/components/ui/button";

export interface HeroProps {
  brandName: string;
  tagline: string;
  productName: string;
  productHref: string;
  price: string;
  /** Optional strike-through "MRP" shown next to the listed price. */
  compareAtPrice?: string | null;
  intro: string;
  ingredients: string[];
}

const ease = [0.22, 1, 0.36, 1] as const;

export function Hero({ brandName, tagline, productName, productHref, price, compareAtPrice, intro, ingredients }: HeroProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const jarY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 80]);
  const haloY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const [first, second] = tagline.split(" ").length > 2 ? [tagline.split(" ").slice(0, 1).join(" "), tagline.split(" ").slice(1).join(" ")] : [tagline, ""];

  const chipPositions = ["left-[2%] top-[22%]", "right-[0%] top-[14%]", "left-[0%] bottom-[24%]", "right-[-2%] top-[44%]"];

  return (
    <section ref={ref} className="relative overflow-hidden bg-milk-glow" aria-labelledby="hero-title">
      <div className="container-page grid items-center gap-10 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-24 lg:pt-16">
        <div className="relative z-10 max-w-xl">
          <m.p className="eyebrow" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }}>
            KMG · Korean Magic Glow
          </m.p>
          <m.h1
            id="hero-title"
            className="mt-5 text-display text-ink"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.08, ease }}
          >
            {first}
            {second && (
              <>
                <br />
                <em className="font-normal italic text-blush-deep">{second}</em>
              </>
            )}
          </m.h1>
          <m.p
            className="mt-6 max-w-md text-base leading-relaxed text-ink-soft sm:text-lg"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.18, ease }}
          >
            {intro}
          </m.p>
          <m.div
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28, ease }}
          >
            <ButtonLink href={productHref} size="lg">
              Shop Now — {price}
            </ButtonLink>
            <ButtonLink href="/ingredients" variant="ghost" size="lg">
              Discover the Formula
            </ButtonLink>
          </m.div>
          <m.dl
            className="mt-10 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 border-t hairline pt-6 text-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <div>
              <dt className="text-ink-muted">Product</dt>
              <dd className="font-semibold text-ink">{productName.replace(`${brandName} `, "")}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Listed price</dt>
              <dd className="font-semibold text-ink">
                {price}
                {compareAtPrice && (
                  <span className="ml-2 text-sm font-normal text-ink-muted line-through" aria-label={`MRP ${compareAtPrice}`}>
                    {compareAtPrice}
                  </span>
                )}
              </dd>
            </div>
          </m.dl>
        </div>

        <div className="relative mx-auto w-full max-w-[34rem]">
          <m.div aria-hidden="true" style={{ y: haloY }} className="absolute inset-[6%] rounded-full border border-white/80 shadow-glow" />
          <m.figure
            style={{ y: jarY }}
            className="relative [container-type:inline-size] [mask-image:radial-gradient(ellipse_72%_68%_at_50%_52%,#000_62%,transparent_100%)]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.1, ease }}
          >
            <Image
              src="/brand/kmg-jar-blank.svg"
              alt=""
              width={800}
              height={1000}
              preload
              loading="eager"
              unoptimized
              className="h-auto w-full"
            />
            {/* Accurate product labelling rendered as live text over the concept jar. */}
            <div
              className="pointer-events-none absolute left-[26.25%] top-[53%] flex h-[26.5%] w-[47.5%] flex-col items-center justify-start text-center"
              aria-hidden="true"
            >
              <span className="text-[2.6cqw] font-semibold uppercase tracking-[0.36em] text-ink">{brandName}</span>
              <span className="my-[1.6cqw] h-px w-[26%] bg-blush-deep/50" />
              <span className="font-display text-[10.5cqw] leading-none tracking-[0.06em] text-ink">KMG</span>
              <span className="mt-[1.4cqw] text-[1.85cqw] font-semibold uppercase tracking-[0.3em] text-ink-soft">Korean Magic Glow</span>
              <span className="mt-[2.4cqw] text-[1.6cqw] font-semibold uppercase tracking-[0.42em] text-blush-deep">Face Cream</span>
            </div>
            <figcaption className="sr-only">Concept visualisation of the {productName} jar.</figcaption>
          </m.figure>
          <m.ul style={{ y: jarY }} className="pointer-events-none absolute inset-0 hidden sm:block" aria-label="Ingredient highlights">
            {ingredients.slice(0, 4).map((name, i) => (
              <m.li
                key={name}
                className={`surface-frost absolute rounded-full px-4 py-2 text-xs font-semibold tracking-wide text-ink shadow-soft ${chipPositions[i]}`}
                initial={{ opacity: 0, y: 10 }}
                animate={reduce ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
                transition={
                  reduce
                    ? { duration: 0.4, delay: 0.6 + i * 0.12 }
                    : {
                        opacity: { duration: 0.6, delay: 0.6 + i * 0.12 },
                        y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 },
                      }
                }
              >
                {name}
              </m.li>
            ))}
          </m.ul>
          <p className="mt-2 text-center text-xs text-ink-muted">Conceptual packaging visualisation — final packaging may differ.</p>
        </div>
      </div>
    </section>
  );
}
