import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { ProductPurchase } from "@/components/product/add-to-cart";
import { Gallery } from "@/components/product/gallery";
import { ProductCard } from "@/components/product/product-card";
import { ProductJsonLd } from "@/components/product/product-json-ld";
import { PriceDisplay } from "@/components/ui/price-display";
import { Badge, ConceptNote, SectionHeading } from "@/components/ui/primitives";
import { publicSiteUrl } from "@/lib/config/env";
import {
  activeProducts,
  approvedFaqs,
  getProductBySlug,
  isPurchasable,
  productIngredients,
  productSkinTypes,
  renderFaq,
} from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";
import { formatINR } from "@/lib/money";

export async function generateStaticParams() {
  const content = await getSiteContent();
  const slugs = activeProducts(content).map((p) => ({ slug: p.slug }));
  // Cache Components requires at least one sample; an unknown slug renders the 404 page.
  return slugs.length > 0 ? slugs : [{ slug: "no-products" }];
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const content = await getSiteContent();
  const product = getProductBySlug(content, slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return {
    title: { absolute: product.seoTitle },
    description: product.seoDescription,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { type: "website", title: product.seoTitle, description: product.seoDescription, url: `/products/${product.slug}` },
  };
}

export default function ProductPage({ params }: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<ProductSkeleton />}>
      <ProductContent params={params} />
    </Suspense>
  );
}

function ProductSkeleton() {
  return (
    <div className="container-page grid gap-10 py-14 lg:grid-cols-2 lg:gap-16" aria-hidden="true">
      <div className="skeleton aspect-[4/5]" />
      <div className="space-y-5">
        <div className="skeleton h-4 w-1/2" />
        <div className="skeleton h-24 w-full" />
        <div className="skeleton h-8 w-24" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-14 w-full rounded-full" />
      </div>
    </div>
  );
}

async function ProductContent({ params }: { params: PageProps<"/products/[slug]">["params"] }) {
  const { slug } = await params;
  const content = await getSiteContent();
  const product = getProductBySlug(content, slug);
  if (!product) notFound();

  const ingredients = productIngredients(content, product);
  const skinTypes = productSkinTypes(content, product);
  const benefits = product.benefits.filter((b) => b.approved);
  const faqs = approvedFaqs(content)
    .filter((f) => ["product", "ingredients", "skin"].includes(f.category))
    .map((f) => renderFaq(content, f));
  const related = activeProducts(content).filter((p) => p.id !== product.id).slice(0, 3);
  const { commerce } = content;
  const allConcept = product.images.every((i) => i.kind === "concept");

  return (
    <>
      <ProductJsonLd product={product} content={content} siteUrl={publicSiteUrl()} />
      <div className="container-page pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-ink-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li>
              <Link href="/" className="hover:text-ink">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href="/shop" className="hover:text-ink">
                Shop
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-ink">
              {product.shortName}
            </li>
          </ol>
        </nav>
      </div>

      <section className="container-page grid gap-10 pb-16 pt-8 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <Gallery images={product.images} productName={product.name} />
          {allConcept && <ConceptNote className="mt-3" />}
        </div>

        <div>
          <p className="eyebrow">{product.tagline}</p>
          <h1 className="mt-4 text-h1 text-ink">{product.name}</h1>
          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <PriceDisplay pricePaise={product.pricePaise} size="lg" />
            {product.sizeLabel && <span className="text-base font-normal text-ink-muted">/ {product.sizeLabel}</span>}
          </div>
          {commerce.pricesIncludeTax !== null && (
            <p className="mt-1 text-xs text-ink-muted">{commerce.pricesIncludeTax ? "Inclusive of applicable taxes." : "Applicable taxes calculated at checkout."}</p>
          )}
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">{product.shortDescription}</p>

          {skinTypes.length > 0 && (
            <div className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Positioned for</p>
              <div className="flex flex-wrap gap-2">
                {skinTypes.map((s) => (
                  <Link key={s.id} href={`/shop?skin=${s.id}`}>
                    <Badge tone="lavender">{s.label}</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="mt-5">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">Ingredient highlights</p>
            <div className="flex flex-wrap gap-2">
              {ingredients.map((i) => (
                <Link key={i.id} href={`/ingredients#${i.id}`}>
                  <Badge tone={i.id === "vitamin-c" ? "citrus" : "blush"}>{i.name}</Badge>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t hairline pt-8">
            <ProductPurchase productId={product.id} productName={product.shortName} max={commerce.maxQuantityPerLine} purchasable={isPurchasable(product)} />
          </div>

          <ul className="mt-6 space-y-2 text-sm text-ink-soft">
            <li>
              {commerce.shippingFeePaise === null
                ? "Shipping charges and delivery timelines are being confirmed — checkout explains your options."
                : `Shipping: ${commerce.shippingFeePaise === 0 ? "free" : formatINR(commerce.shippingFeePaise)}${
                    commerce.freeShippingThresholdPaise !== null ? `, free on orders of ${formatINR(commerce.freeShippingThresholdPaise)} or more` : ""
                  }.`}
            </li>
            {commerce.deliveryEstimate && <li>Estimated delivery: {commerce.deliveryEstimate}.</li>}
            <li>
              Questions?{" "}
              <Link href="/contact" className="font-semibold text-ink underline underline-offset-4">
                Contact our team
              </Link>{" "}
              or ask the assistant.
            </li>
          </ul>

          <div className="mt-10 space-y-0 border-t hairline">
            <Detail title="Description" open>
              {product.description.split(/\n{2,}/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </Detail>
            {benefits.length > 0 && (
              <Detail title="What it's designed for">
                <ul>
                  {benefits.map((b) => (
                    <li key={b.id}>
                      <strong className="font-semibold text-ink">{b.title}.</strong> {b.text}
                    </li>
                  ))}
                </ul>
                <p className="text-sm">Results depend on the formulation and individual skin response.</p>
              </Detail>
            )}
            <Detail title="Ingredients">
              <p>Ingredient highlights: {ingredients.map((i) => i.name).join(", ")}.</p>
              {product.fullIngredientDeclaration ? (
                <p>
                  <strong className="font-semibold text-ink">Full ingredients:</strong> {product.fullIngredientDeclaration}
                </p>
              ) : (
                <p>The complete ingredient declaration has not been published yet. Please refer to the product packaging for the full ingredient list.</p>
              )}
            </Detail>
            <Detail title="How to use">
              {product.usageInstructions ? (
                <p>{product.usageInstructions}</p>
              ) : (
                <p>Verified directions for use have not been published yet. Please follow the directions on the product packaging, or confirm them with our team.</p>
              )}
            </Detail>
            <Detail title="Safety & patch test">
              <p>{product.safetyNotes}</p>
            </Detail>
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="border-t hairline bg-milk py-[var(--spacing-section)]" aria-labelledby="product-faq">
          <div className="container-page grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <SectionHeading id="product-faq" eyebrow="Product questions" title="Before you add to bag" />
            <FaqAccordion faqs={faqs} />
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="py-[var(--spacing-section)]" aria-labelledby="related">
          <div className="container-page">
            <SectionHeading id="related" eyebrow="You may also like" title="More from Amros Beauty" />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} content={content} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}

function Detail({ title, children, open = false }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b hairline" open={open}>
      <summary className="flex items-center justify-between py-5 text-base font-semibold text-ink">
        {title}
        <span aria-hidden="true" className="text-xl font-normal transition-transform duration-300 group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="prose-amros space-y-3 pb-6 text-[0.95rem]">{children}</div>
    </details>
  );
}
