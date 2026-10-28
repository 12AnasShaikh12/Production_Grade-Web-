import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductCard } from "@/components/product/product-card";
import { ShopControls } from "@/components/shop/shop-controls";
import { ButtonLink } from "@/components/ui/button";
import { PageHero } from "@/components/ui/primitives";
import { filterProducts, parseFilters, sortedCategories, sortedSkinTypes } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Shop Skincare",
  description: "Shop Amros Beauty skincare. Filter by product category and skin type — dry or sensitive skin. Prices in INR.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage({ searchParams }: PageProps<"/shop">) {
  return (
    <>
      <PageHero
        eyebrow="Shop"
        title={
          <>
            The <em className="italic text-blush-deep">Amros Beauty</em> collection
          </>
        }
        intro="Browse by category or skin type. Every price shown comes directly from our product records."
      />
      <section className="container-page py-12 sm:py-16" aria-label="Products">
        <Suspense fallback={<ShopSkeleton />}>
          <ShopResults searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function ShopResults({ searchParams }: { searchParams: PageProps<"/shop">["searchParams"] }) {
  const [params, content] = await Promise.all([searchParams, getSiteContent()]);
  const filters = parseFilters(content, params);
  const products = filterProducts(content, filters);
  const category = content.categories.find((c) => c.id === filters.category);

  return (
    <ShopControls
      filters={filters}
      resultCount={products.length}
      categories={sortedCategories(content).map((c) => ({ id: c.id, label: c.label }))}
      skinTypes={sortedSkinTypes(content).map((s) => ({ id: s.id, label: s.label }))}
    >
      {products.length > 0 ? (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} content={content} priority={i === 0} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-milk px-6 py-16 text-center">
          <p className="eyebrow">No matching products yet</p>
          <h2 className="mx-auto mt-4 max-w-xl text-h3 text-ink">
            {category && !category.isAll && filters.q === ""
              ? `We don't have products confirmed for ${category.label} yet.`
              : "Nothing matches these filters right now."}
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-ink-soft">
            {category && !category.isAll && category.description}{" "}
            Our range is growing — clear the filters to see everything available today, or ask our team what&apos;s coming next.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/shop">View all products</ButtonLink>
            <ButtonLink href="/contact" variant="ghost">
              Contact our team
            </ButtonLink>
          </div>
        </div>
      )}
    </ShopControls>
  );
}

function ShopSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton h-28 w-full" />
      <div className="mt-6 skeleton h-5 w-40" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-line bg-milk">
            <div className="skeleton aspect-[4/5] rounded-none" />
            <div className="space-y-3 p-5">
              <div className="skeleton h-3 w-2/3" />
              <div className="skeleton h-6 w-full" />
              <div className="skeleton h-10 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
