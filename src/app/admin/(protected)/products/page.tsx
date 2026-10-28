import Link from "next/link";
import { Panel } from "@/components/admin/inputs";
import { Badge } from "@/components/ui/primitives";
import { buttonClasses } from "@/components/ui/button";
import { loadContent } from "@/lib/data/content";
import { formatINR } from "@/lib/money";

export const metadata = { title: "Products" };

export default async function AdminProducts() {
  const { content } = await loadContent();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Catalog</p>
          <h1 className="mt-2 text-h2 text-ink">Products</h1>
        </div>
        <Link href="/admin/products/new" className={buttonClasses("primary", "sm")}>
          Add product
        </Link>
      </div>
      <Panel title={`${content.products.length} product${content.products.length === 1 ? "" : "s"}`}>
        <ul className="divide-y divide-line">
          {content.products.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <Link href={`/admin/products/${p.id}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                  {p.name}
                </Link>
                <p className="text-xs text-ink-muted">
                  /products/{p.slug} · {formatINR(p.pricePaise)} · {p.categoryIds.join(", ") || "no categories"}
                </p>
              </div>
              <div className="flex gap-2">
                <Badge tone={p.status === "active" ? "success" : "neutral"}>{p.status}</Badge>
                {!p.claimsApproved && <Badge tone="warning">Copy awaiting sign-off</Badge>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
