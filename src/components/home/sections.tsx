import Link from "next/link";
import type { Benefit, Category, Faq, Ingredient, Product, SiteContent } from "@/lib/content/schemas";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { activeProducts } from "@/lib/content/selectors";
import { ProductImage } from "@/components/product/product-image";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

export function IngredientsIntro({ ingredients }: { ingredients: Ingredient[] }) {
  return (
    <section className="py-[var(--spacing-section)]" aria-labelledby="ingredients-heading">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="ingredients-heading"
            eyebrow="The formula, highlighted"
            title={
              <>
                Four familiar ingredients, <em className="italic text-blush-deep">one soft ritual</em>
              </>
            }
            intro="KMG brings together four ingredient highlights that are widely used across skincare. Here is what each is generally known for."
          />
          <ButtonLink href="/ingredients" variant="quiet" className="self-start md:self-end">
            Read the ingredient notes →
          </ButtonLink>
        </div>
        <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {ingredients.map((ing, i) => (
            <Reveal as="li" key={ing.id} delay={i * 0.08}>
              <Link href={`/ingredients#${ing.id}`} className="group block">
                <div className="overflow-hidden rounded-lg bg-pearl">
                  <ProductImage
                    src={ing.image}
                    alt=""
                    width={800}
                    height={1000}
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="aspect-[4/5] h-auto w-full object-cover transition-transform duration-700 ease-[var(--ease-silk)] group-hover:scale-[1.04]"
                  />
                </div>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">0{i + 1}</p>
                <h3 className="mt-1 font-display text-h3 text-ink">{ing.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{ing.role}</p>
              </Link>
            </Reveal>
          ))}
        </ul>
        <p className="mt-10 max-w-3xl text-xs leading-relaxed text-ink-muted">
          General ingredient information, not a verified claim about the finished formula. How a product performs depends on its formulation, ingredient
          concentrations and your individual skin.
        </p>
      </div>
    </section>
  );
}

export function BenefitsSection({ benefits, product }: { benefits: Benefit[]; product: Product }) {
  if (benefits.length === 0) return null;
  return (
    <section className="border-y hairline bg-milk py-[var(--spacing-section)]" aria-labelledby="benefits-heading">
      <div className="container-page grid gap-14 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <SectionHeading
            id="benefits-heading"
            eyebrow="Why KMG"
            title="A hydration-focused cream with a luminous, milky finish in mind"
            intro={product.shortDescription}
          />
          <ButtonLink href={`/products/${product.slug}`} className="mt-8">
            View the cream
          </ButtonLink>
        </div>
        <ol className="divide-y divide-line border-y hairline">
          {benefits.map((b, i) => (
            <Reveal as="li" key={b.id} delay={i * 0.06} className="grid grid-cols-[3rem_1fr] gap-4 py-8 sm:grid-cols-[4.5rem_1fr]">
              <span className="font-display text-4xl leading-none text-blush-deep/80" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-h3 text-ink">{b.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-soft">{b.text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
      <p className="container-page mt-10 text-xs text-ink-muted">Individual results vary with skin type, routine and formulation. Cosmetic information only.</p>
    </section>
  );
}

export function CategoryBrowse({ categories, content }: { categories: Category[]; content: SiteContent }) {
  const products = activeProducts(content);
  return (
    <section className="py-[var(--spacing-section)]" aria-labelledby="categories-heading">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <SectionHeading
          id="categories-heading"
          eyebrow="Browse by concern"
          title="Find your ritual"
          intro="Explore the collection by product type or skin concern. Products appear only in the categories they have been confirmed for — more are on the way."
        />
        <ul className="border-t hairline">
          {categories.map((c) => {
            const count = c.isAll ? products.length : products.filter((p) => p.categoryIds.includes(c.id)).length;
            return (
              <li key={c.id} className="border-b hairline">
                <Link
                  href={c.isAll ? "/shop" : `/shop?category=${c.id}`}
                  className="group flex items-center justify-between gap-6 py-5 transition-[padding] duration-300 hover:pl-3"
                >
                  <span>
                    <span className="block font-display text-2xl text-ink transition-colors group-hover:text-blush-deep sm:text-3xl">{c.label}</span>
                    <span className="mt-1 block text-sm text-ink-muted">{c.description}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {count > 0 ? `${count} product${count === 1 ? "" : "s"}` : "Coming soon"}
                    <span aria-hidden="true" className="ml-3 inline-block transition-transform group-hover:translate-x-1">
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

export function TextureEditorial({ product, tagline }: { product: Product; tagline: string }) {
  const texture = product.images[2] ?? product.images[0];
  return (
    <section className="relative overflow-hidden bg-ink py-[var(--spacing-section)] text-milk" aria-labelledby="texture-heading">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <Reveal className="relative">
          <div className="overflow-hidden rounded-lg">
            <ProductImage
              src={texture.src}
              alt={texture.alt}
              width={texture.width}
              height={texture.height}
              sizes="(min-width: 1024px) 45vw, 90vw"
              className="aspect-[4/5] h-auto w-full object-cover"
            />
          </div>
        </Reveal>
        <div className="max-w-lg">
          <p className="eyebrow text-blush">The texture story</p>
          <h2 id="texture-heading" className="mt-4 text-h2 text-milk">
            {tagline}: soft, milky, <em className="italic text-citrus-soft">luminous</em>.
          </h2>
          <p className="mt-6 leading-relaxed text-milk/80">
            Milky Glassy Glow is the look and feel KMG is inspired by — a cream that brings a soft, luminous moment to your routine, with Hyaluronic Acid
            for a hydration-focused finish.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-milk/65">
            An aesthetic description, not a promised result. Exact texture and pack size will be confirmed with the final formula and packaging.
          </p>
          <ButtonLink href={`/products/${product.slug}`} variant="secondary" className="mt-8 border-milk/70 bg-transparent text-milk hover:bg-milk hover:text-ink">
            Explore KMG
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

export function FaqPreview({ faqs }: { faqs: Faq[] }) {
  return (
    <section className="py-[var(--spacing-section)]" aria-labelledby="faq-heading">
      <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading id="faq-heading" eyebrow="Questions" title="Good to know" intro="Answers from our approved product knowledge — the same source our assistant uses." />
          <ButtonLink href="/faq" variant="ghost" className="mt-8">
            All FAQs
          </ButtonLink>
        </div>
        <FaqAccordion faqs={faqs} />
      </div>
    </section>
  );
}

export function ContactCta({ content }: { content: SiteContent }) {
  const { brand } = content;
  return (
    <section className="pb-[var(--spacing-section)]" aria-labelledby="contact-cta-heading">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-xl bg-milk-glow px-6 py-14 text-center sm:px-12 sm:py-20">
          <p className="eyebrow">Customer care</p>
          <h2 id="contact-cta-heading" className="mx-auto mt-4 max-w-2xl text-h2 text-ink">
            Questions about KMG? Talk to the Amros Beauty team.
          </h2>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href={`mailto:${brand.email}`}>Email {brand.email}</ButtonLink>
            <ButtonLink href={`tel:${brand.phoneE164}`} variant="ghost">
              Call {brand.phoneDisplay}
            </ButtonLink>
          </div>
          <a
            href={brand.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm font-semibold text-ink underline underline-offset-4"
          >
            Follow {brand.instagramHandle} on Instagram<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </div>
    </section>
  );
}
