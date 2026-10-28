import { saveProductAction } from "@/app/admin/actions";
import { AdminForm } from "@/components/admin/admin-form";
import { AArea, ACheck, ASelect, AText, Panel } from "@/components/admin/inputs";
import type { Product, SiteContent } from "@/lib/content/schemas";
import { paiseToDecimalString } from "@/lib/money";

export function ProductForm({ product, content }: { product: Product | null; content: SiteContent }) {
  const p = product;
  const images = [...(p?.images ?? []), ...Array.from({ length: 2 }, () => null)];
  const benefits = [...(p?.benefits ?? []), ...Array.from({ length: 2 }, () => null)];

  return (
    <AdminForm action={saveProductAction} submitLabel={p ? "Save product" : "Create product"}>
      <input type="hidden" name="recordId" value={p?.id ?? ""} />

      <Panel title="Basics">
        <div className="grid gap-4 md:grid-cols-2">
          <AText label="Product name" name="name" defaultValue={p?.name} required maxLength={140} />
          <AText label="Short name" name="shortName" defaultValue={p?.shortName} required maxLength={60} hint="Used in the bag, chatbot and FAQs." />
          <AText label="URL slug" name="slug" defaultValue={p?.slug} hint="Lowercase words separated by hyphens." />
          <AText label="Tagline" name="tagline" defaultValue={p?.tagline} required maxLength={140} />
          <AText label="Price (₹)" name="price" defaultValue={p ? paiseToDecimalString(p.pricePaise) : ""} required hint="Stored as integer paise." />
          <AText label="Pack size" name="sizeLabel" defaultValue={p?.sizeLabel} hint="e.g. 50 g — leave empty until confirmed." />
          <ASelect
            label="Status"
            name="status"
            defaultValue={p?.status ?? "draft"}
            options={[
              { value: "draft", label: "Draft (hidden)" },
              { value: "active", label: "Active (published)" },
              { value: "archived", label: "Archived" },
            ]}
          />
          <ASelect
            label="Availability"
            name="availability"
            defaultValue={p?.availability ?? "unconfirmed"}
            options={[
              { value: "unconfirmed", label: "Not confirmed" },
              { value: "in_stock", label: "In stock" },
              { value: "out_of_stock", label: "Out of stock" },
            ]}
          />
        </div>
      </Panel>

      <Panel title="Copy" description="All copy is checked for unsupported claims (whitening, cures, guarantees, certifications, percentages…) before publishing.">
        <div className="space-y-4">
          <AArea label="Short description" name="shortDescription" defaultValue={p?.shortDescription} rows={2} required maxLength={300} />
          <AArea label="Full description" name="description" defaultValue={p?.description} rows={6} required maxLength={3000} hint="Separate paragraphs with a blank line." />
          <AArea label="Full ingredient declaration (INCI)" name="fullIngredientDeclaration" defaultValue={p?.fullIngredientDeclaration} rows={3} hint="Leave empty until verified from the final packaging." />
          <AArea label="Directions for use" name="usageInstructions" defaultValue={p?.usageInstructions} rows={3} hint="Only verified directions." />
          <AArea label="Safety notes" name="safetyNotes" defaultValue={p?.safetyNotes} rows={3} required />
        </div>
      </Panel>

      <Panel title="Mappings" description="Only assign categories and skin types the brand has confirmed.">
        <div className="grid gap-6 md:grid-cols-3">
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Categories</legend>
            <div className="space-y-2">
              {content.categories
                .filter((c) => !c.isAll)
                .map((c) => (
                  <ACheck key={c.id} name="categoryIds" value={c.id} label={c.label} defaultChecked={p?.categoryIds.includes(c.id)} />
                ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Skin types</legend>
            <div className="space-y-2">
              {content.skinTypes.map((s) => (
                <ACheck key={s.id} name="skinTypeIds" value={s.id} label={s.label} defaultChecked={p?.skinTypeIds.includes(s.id)} />
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Ingredient highlights</legend>
            <div className="space-y-2">
              {content.ingredients.map((i) => (
                <ACheck key={i.id} name="ingredientIds" value={i.id} label={i.name} defaultChecked={p?.ingredientIds.includes(i.id)} />
              ))}
            </div>
          </fieldset>
        </div>
      </Panel>

      <Panel title="Benefit statements" description="Unapproved statements are stored but never shown or used by the assistant. Leave a row empty to remove it.">
        <div className="space-y-5">
          {benefits.map((b, i) => (
            <div key={i} className="grid gap-3 rounded-md border border-line p-4 md:grid-cols-[1fr_2fr]">
              <input type="hidden" name={`benefits.${i}.id`} defaultValue={b?.id ?? ""} />
              <AText label="Title" name={`benefits.${i}.title`} defaultValue={b?.title} maxLength={80} />
              <AArea label="Statement" name={`benefits.${i}.text`} defaultValue={b?.text} rows={2} maxLength={400} />
              <ACheck name={`benefits.${i}.approved`} label="Approved for publication" defaultChecked={b?.approved} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Images" description="Site paths (e.g. /brand/kmg-jar-front.svg) or https URLs. Mark real photography as “photo”. Leave the path empty to remove a row.">
        <div className="space-y-5">
          {images.map((img, i) => (
            <div key={i} className="grid gap-3 rounded-md border border-line p-4 md:grid-cols-2">
              <AText label="Image path" name={`images.${i}.src`} defaultValue={img?.src} />
              <AText label="Alt text" name={`images.${i}.alt`} defaultValue={img?.alt} maxLength={200} />
              <AText label="Width (px)" name={`images.${i}.width`} type="number" defaultValue={img?.width ?? 800} />
              <AText label="Height (px)" name={`images.${i}.height`} type="number" defaultValue={img?.height ?? 1000} />
              <ASelect
                label="Kind"
                name={`images.${i}.kind`}
                defaultValue={img?.kind ?? "concept"}
                options={[
                  { value: "concept", label: "Concept visualisation" },
                  { value: "photo", label: "Real product photo" },
                ]}
              />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="SEO">
        <div className="grid gap-4 md:grid-cols-2">
          <AText label="SEO title" name="seoTitle" defaultValue={p?.seoTitle} required maxLength={70} />
          <AArea label="Meta description" name="seoDescription" defaultValue={p?.seoDescription} rows={2} required maxLength={170} />
        </div>
      </Panel>

      <Panel title="Owner approval">
        <ACheck
          name="claimsApproved"
          defaultChecked={p?.claimsApproved}
          label="The owner has reviewed this product's copy and benefit statements against the real formulation."
        />
      </Panel>
    </AdminForm>
  );
}
