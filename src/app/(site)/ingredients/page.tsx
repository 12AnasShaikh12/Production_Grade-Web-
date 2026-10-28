import type { Metadata } from "next";
import { ProductImage } from "@/components/product/product-image";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Notice, PageHero } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { primaryProduct } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Ingredients",
  description:
    "The ingredient highlights across the Amros Beauty collection — Vitamin C, Hyaluronic Acid, Niacinamide, Vitamin E, Glutathione, Kojic acid, Arbutin and Avocado — explained with care.",
  alternates: { canonical: "/ingredients" },
};

export default async function IngredientsPage() {
  const content = await getSiteContent();
  const product = primaryProduct(content);
  // Show every approved ingredient across the collection, not just the primary product's four.
  const ingredients = content.ingredients.filter((i) => i.approved);

  return (
    <>
      <PageHero
        eyebrow="Ingredients"
        title={
          <>
            The formula, <em className="italic text-blush-deep">highlighted</em>
          </>
        }
        intro="A closer look at the ingredient highlights across the Amros Beauty collection — what each is generally known for in skincare, and what we can and can't say about our finished formulas."
      />

      <div className="container-page pt-10">
        <Notice title="How to read this page">
          The notes below describe each ingredient in general terms. They are not verified claims about the finished KMG formula. A product&apos;s
          performance depends on its formulation, ingredient concentrations and your individual skin. Ingredient percentages and the complete ingredient
          declaration have not been published yet — please refer to the product packaging.
        </Notice>
      </div>

      <div className="container-page divide-y divide-line py-10">
        {ingredients.map((ing, i) => (
          <section key={ing.id} id={ing.id} aria-labelledby={`${ing.id}-title`} className="scroll-mt-24 py-14">
            <div className={`grid items-center gap-10 lg:grid-cols-2 ${i % 2 ? "lg:[&>*:first-child]:order-2" : ""}`}>
              <Reveal>
                <div className="overflow-hidden rounded-lg bg-pearl">
                  <ProductImage src={ing.image} alt="" width={800} height={1000} className="aspect-[4/5] h-auto w-full object-cover sm:aspect-[5/4]" />
                </div>
              </Reveal>
              <div className="max-w-xl">
                <p className="eyebrow">Ingredient 0{i + 1}</p>
                <h2 id={`${ing.id}-title`} className="mt-3 text-h2 text-ink">
                  {ing.name}
                </h2>
                <p className="mt-5 text-lg leading-relaxed text-ink">{ing.role}</p>
                <div className="mt-8 space-y-5">
                  <div>
                    <Badge>General ingredient knowledge</Badge>
                    <p className="mt-3 leading-relaxed text-ink-soft">{ing.generalInfo}</p>
                  </div>
                  <div>
                    <Badge tone={ing.verifiedProductNote ? "success" : "warning"}>In the KMG formula</Badge>
                    <p className="mt-3 leading-relaxed text-ink-soft">
                      {ing.verifiedProductNote ??
                        `${ing.name} is one of the supplied ingredient highlights of KMG. Its form and concentration in the finished formula have not been published.`}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      {product && (
        <section className="container-page pb-[var(--spacing-section)]">
          <div className="flex flex-col items-start gap-4 rounded-lg border border-line bg-milk p-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-display text-2xl text-ink">See all four together in {product.shortName}.</p>
            <ButtonLink href={`/products/${product.slug}`}>View the cream</ButtonLink>
          </div>
        </section>
      )}
    </>
  );
}
