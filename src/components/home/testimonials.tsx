import Link from "next/link";
import type { Product, SiteContent, Testimonial } from "@/lib/content/schemas";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  const full = Math.max(1, Math.min(5, rating));
  return (
    <p className="mb-3 flex items-center gap-1 text-blush-deep" aria-label={`${full} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} aria-hidden="true" className={i < full ? "" : "text-ink-muted/30"}>
          ★
        </span>
      ))}
    </p>
  );
}

function TestimonialCard({ testimonial, product }: { testimonial: Testimonial; product: Product | undefined }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-line bg-milk p-6 shadow-soft">
      <Stars rating={testimonial.rating} />
      <blockquote className="flex-1 text-ink-soft">
        <p className="font-display text-lg leading-relaxed text-ink before:mr-1 before:content-['“'] after:ml-1 after:content-['”']">
          {testimonial.quote}
        </p>
      </blockquote>
      <footer className="mt-6 flex items-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-blush/40 font-display text-sm font-semibold text-blush-deep"
        >
          {initials(testimonial.author)}
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-ink">{testimonial.author}</p>
          <p className="text-xs text-ink-muted">
            {[testimonial.location, testimonial.sharedOn].filter(Boolean).join(" · ")}
          </p>
          {product && (
            <p className="mt-0.5 text-xs">
              <Link href={`/products/${product.slug}`} className="text-blush-deep underline underline-offset-4 hover:text-ink">
                {product.shortName}
              </Link>
            </p>
          )}
        </div>
      </footer>
    </article>
  );
}

export function Testimonials({
  testimonials,
  content,
}: {
  testimonials: Testimonial[];
  content: SiteContent;
}) {
  if (testimonials.length === 0) return null;
  const productFor = (id: string | null): Product | undefined =>
    id ? content.products.find((p) => p.id === id) : undefined;

  return (
    <section className="bg-milk-glow py-[var(--spacing-section)]" aria-labelledby="testimonials-heading">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
          <SectionHeading
            id="testimonials-heading"
            eyebrow="From our community"
            title={
              <>
                What customers say about <em className="italic text-blush-deep">Amros Beauty</em>
              </>
            }
            intro="A selection of notes shared with us by customers who have tried the collection. Share yours by messaging us on Instagram."
          />
          <a
            href={content.brand.instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-ink underline underline-offset-4"
          >
            Follow {content.brand.instagramHandle}
            <span className="sr-only"> on Instagram (opens in a new tab)</span>
          </a>
        </div>

        <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.slice(0, 6).map((t, i) => (
            <Reveal as="li" key={t.id} delay={i * 0.06} className="h-full">
              <TestimonialCard testimonial={t} product={productFor(t.productId)} />
            </Reveal>
          ))}
        </ul>

        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-ink-muted">
          Testimonials describe individual experiences and do not guarantee the same outcome for every customer. They are not medical advice. Cosmetic
          information only.
        </p>
      </div>
    </section>
  );
}
