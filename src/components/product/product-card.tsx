import Link from "next/link";
import type { Product, SiteContent } from "@/lib/content/schemas";
import { isPurchasable, productIngredients, productSkinTypes } from "@/lib/content/selectors";
import { PriceDisplay } from "@/components/ui/price-display";
import { ProductImage } from "./product-image";
import { QuickAddButton } from "./add-to-cart";

export function ProductCard({ product, content, priority = false }: { product: Product; content: SiteContent; priority?: boolean }) {
  const image = product.images[0];
  const href = `/products/${product.slug}`;
  const skinTypes = productSkinTypes(content, product);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-milk transition-shadow duration-500 hover:shadow-lift">
      <Link href={href} className="block overflow-hidden bg-pearl" aria-label={`View ${product.name}`} tabIndex={-1}>
        <ProductImage
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          priority={priority}
          sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
          className="aspect-[4/5] h-auto w-full object-cover transition-transform duration-700 ease-[var(--ease-silk)] group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-muted">
          {productIngredients(content, product)
            .map((i) => i.name)
            .join(" · ")}
        </p>
        <h3 className="font-display text-2xl leading-tight text-ink">
          <Link href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
            {product.name}
          </Link>
        </h3>
        {skinTypes.length > 0 && <p className="text-sm text-ink-soft">For {skinTypes.map((s) => s.label.toLowerCase()).join(" & ")}</p>}
        <div className="relative z-10 mt-auto flex flex-wrap items-end justify-between gap-3 pt-2">
          <PriceDisplay pricePaise={product.pricePaise} size="sm" />
          <QuickAddButton
            productId={product.id}
            productName={product.name}
            max={content.commerce.maxQuantityPerLine}
            purchasable={isPurchasable(product)}
          />
        </div>
      </div>
    </article>
  );
}
