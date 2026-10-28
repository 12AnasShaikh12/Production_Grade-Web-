import type { Product, SiteContent } from "@/lib/content/schemas";
import { productCategories } from "@/lib/content/selectors";
import { paiseToDecimalString } from "@/lib/money";

/**
 * Product structured data built only from real product fields. No ratings, reviews or
 * availability are emitted unless they exist in the data (availability is omitted while unconfirmed).
 */
export function ProductJsonLd({ product, content, siteUrl }: { product: Product; content: SiteContent; siteUrl: string }) {
  const url = `${siteUrl}/products/${product.slug}`;
  const availability =
    product.availability === "in_stock"
      ? "https://schema.org/InStock"
      : product.availability === "out_of_stock"
        ? "https://schema.org/OutOfStock"
        : undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.id,
    url,
    image: product.images.map((i) => (i.src.startsWith("http") ? i.src : `${siteUrl}${i.src}`)),
    brand: { "@type": "Brand", name: content.brand.name },
    category: productCategories(content, product)
      .map((c) => c.label)
      .join(", ") || undefined,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: product.currency,
      price: paiseToDecimalString(product.pricePaise),
      ...(availability ? { availability } : {}),
    },
  };
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output with "<" escaped cannot break out of the script element.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
