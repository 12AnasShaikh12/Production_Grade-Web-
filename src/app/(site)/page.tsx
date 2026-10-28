import { Hero } from "@/components/home/hero";
import { BenefitsSection, CategoryBrowse, ContactCta, FaqPreview, IngredientsIntro, TextureEditorial } from "@/components/home/sections";
import { SkinTypeSelector } from "@/components/home/skin-type-selector";
import { Testimonials } from "@/components/home/testimonials";
import { ProductCard } from "@/components/product/product-card";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import {
  activeProducts,
  approvedFaqs,
  approvedTestimonials,
  primaryProduct,
  productIngredients,
  renderFaq,
  sortedCategories,
  sortedSkinTypes,
} from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";
import { compareAtPaise, formatINR } from "@/lib/money";

export default async function HomePage() {
  const content = await getSiteContent();
  const product = primaryProduct(content);
  const products = activeProducts(content);

  return (
    <>
      {product ? (
        <Hero
          brandName={content.brand.name}
          tagline={content.brand.tagline}
          productName={product.name}
          productHref={`/products/${product.slug}`}
          price={formatINR(product.pricePaise)}
          compareAtPrice={(() => {
            const c = compareAtPaise(product.pricePaise);
            return c ? formatINR(c) : null;
          })()}
          intro={`${product.name}. ${product.shortDescription}`}
          ingredients={productIngredients(content, product).map((i) => i.name)}
        />
      ) : (
        <section className="bg-milk-glow py-24">
          <div className="container-page">
            <SectionHeading as="h1" eyebrow={content.brand.name} title={content.brand.tagline} intro={content.brand.shortDescription} />
          </div>
        </section>
      )}

      {product && <IngredientsIntro ingredients={productIngredients(content, product)} />}
      {product && <BenefitsSection benefits={product.benefits.filter((b) => b.approved)} product={product} />}

      <SkinTypeSelector
        productShortName={product?.shortName ?? content.brand.name}
        options={sortedSkinTypes(content).map((s) => ({
          id: s.id,
          label: s.label,
          description: s.description,
          productCount: products.filter((p) => p.skinTypeIds.includes(s.id)).length,
        }))}
      />

      {products.length > 0 && (
        <section className="py-[var(--spacing-section)]" aria-labelledby="collection-heading">
          {products.length === 1 ? (
            <div className="container-page grid items-center gap-12 md:grid-cols-[1fr_minmax(0,24rem)] lg:gap-20">
              <div>
                <SectionHeading
                  id="collection-heading"
                  eyebrow="The collection"
                  title={
                    <>
                      Meet <em className="italic text-blush-deep">KMG</em>
                    </>
                  }
                  intro={products[0].shortDescription}
                />
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/products/${products[0].slug}`}>View details</ButtonLink>
                  <ButtonLink href="/shop" variant="ghost">
                    Browse the shop
                  </ButtonLink>
                </div>
              </div>
              <ProductCard product={products[0]} content={content} />
            </div>
          ) : (
            <div className="container-page">
              <SectionHeading id="collection-heading" eyebrow="The collection" title="Shop Amros Beauty" />
              <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.slice(0, 3).map((p) => (
                  <ProductCard key={p.id} product={p} content={content} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <CategoryBrowse categories={sortedCategories(content)} content={content} />
      {product && <TextureEditorial product={product} tagline={content.brand.tagline} />}
      <Testimonials testimonials={approvedTestimonials(content)} content={content} />
      <FaqPreview faqs={approvedFaqs(content).slice(0, 5).map((f) => renderFaq(content, f))} />
      <ContactCta content={content} />
    </>
  );
}
