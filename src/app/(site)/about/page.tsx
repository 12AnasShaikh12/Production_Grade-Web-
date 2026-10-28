import type { Metadata } from "next";
import { ProductImage } from "@/components/product/product-image";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { primaryProduct } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Amros Beauty: skincare built around considered formulation storytelling and the Milky Glassy Glow aesthetic.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const content = await getSiteContent();
  const { brand } = content;
  const product = primaryProduct(content);

  return (
    <>
      <PageHero
        eyebrow="Our story"
        title={
          <>
            Skincare with a <em className="italic text-blush-deep">{brand.tagline}</em> point of view
          </>
        }
        intro={brand.shortDescription}
      />

      <section className="py-[var(--spacing-section)]">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:items-center">
          <Reveal>
            <div className="overflow-hidden rounded-lg bg-pearl">
              <ProductImage
                src="/brand/texture-hydration.svg"
                alt="Abstract illustration of soft hydration ripples around a single droplet"
                width={800}
                height={1000}
                className="aspect-[4/5] h-auto w-full object-cover"
              />
            </div>
          </Reveal>
          <div className="prose-amros max-w-xl text-lg">
            <h2 className="!mt-0 text-h2">What we&apos;re building</h2>
            <p>
              {brand.name} is a skincare brand for customers in India. We are drawn to the Korean-beauty idea of skincare as a calm, considered ritual — and
              to a look we call <em>{brand.tagline}</em>: soft, milky and luminous.
            </p>
            <p>
              Our first product, {product ? product.name : "our debut cream"}, brings together four ingredient highlights that are widely used in
              skincare. We would rather tell you clearly what we know about it than make promises we can&apos;t stand behind.
            </p>
            <h2 className="text-h3">How we talk about skincare</h2>
            <ul>
              <li>We separate general ingredient knowledge from claims about our finished formula.</li>
              <li>We don&apos;t promise permanent, medical or guaranteed results — and we never claim to change natural skin colour.</li>
              <li>When a detail hasn&apos;t been confirmed yet, we say so.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t hairline bg-milk py-[var(--spacing-section)]">
        <div className="container-page grid gap-10 md:grid-cols-3">
          {[
            { k: "Milky", v: "A soft, comforting texture story at the centre of the KMG ritual." },
            { k: "Glassy", v: "Clean, minimal presentation inspired by Korean-beauty aesthetics." },
            { k: "Glow", v: "Ingredient highlights commonly associated with a radiant-looking routine." },
          ].map((item, i) => (
            <Reveal key={item.k} delay={i * 0.08}>
              <p className="font-display text-5xl italic text-blush-deep">{item.k}</p>
              <p className="mt-3 leading-relaxed text-ink-soft">{item.v}</p>
            </Reveal>
          ))}
        </div>
        <div className="container-page mt-14 flex flex-col gap-3 sm:flex-row">
          {product && <ButtonLink href={`/products/${product.slug}`}>Meet KMG</ButtonLink>}
          <ButtonLink href="/contact" variant="ghost">
            Get in touch
          </ButtonLink>
        </div>
      </section>
    </>
  );
}
