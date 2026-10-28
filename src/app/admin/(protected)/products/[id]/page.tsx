import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { Notice } from "@/components/ui/primitives";
import { loadContent } from "@/lib/data/content";

export const metadata = { title: "Edit product" };

export default async function AdminProductEdit({ params, searchParams }: PageProps<"/admin/products/[id]">) {
  const [{ id }, sp, { content }] = await Promise.all([params, searchParams, loadContent()]);
  const product = id === "new" ? null : (content.products.find((p) => p.id === id) ?? notFound());
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Products</p>
        <h1 className="mt-2 text-h2 text-ink">{product ? product.name : "Add a product"}</h1>
      </div>
      {sp.created && <Notice tone="success">Product created.</Notice>}
      <ProductForm product={product} content={content} />
    </div>
  );
}
