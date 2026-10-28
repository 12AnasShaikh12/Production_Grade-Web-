import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Notice, PageHero } from "@/components/ui/primitives";
import { activeProducts, sortedSkinTypes } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Skin Guide",
  description: "General, non-diagnostic guidance on dry skin, sensitive skin and patch testing new skincare products.",
  alternates: { canonical: "/skin-guide" },
};

const precautions = [
  {
    title: "Patch-test first",
    text: "Apply a small amount to a discreet area, such as behind the ear or the inner forearm, and wait 24 hours before using a new product on your face.",
  },
  { title: "Introduce one product at a time", text: "Adding products gradually makes it easier to notice how your skin responds to each one." },
  { title: "Stop if irritation occurs", text: "If you notice redness, stinging, itching or swelling, stop using the product. Seek medical help for severe reactions." },
  { title: "Avoid the eye area", text: "Unless a product's directions say otherwise, keep face creams away from the eyes." },
  {
    title: "Ask a professional",
    text: "If you have a skin condition, are pregnant or breastfeeding, or use prescription skincare, check with a dermatologist or doctor before starting new products.",
  },
  { title: "Daily sun protection", text: "Sun protection is a widely recommended part of any daytime routine. KMG is not a sunscreen." },
];

export default async function SkinGuidePage() {
  const content = await getSiteContent();
  const products = activeProducts(content);
  const skinTypes = sortedSkinTypes(content);

  return (
    <>
      <PageHero
        eyebrow="Skin guide"
        title={
          <>
            Know your skin, <em className="italic text-blush-deep">gently</em>
          </>
        }
        intro="General information to help you browse. This guide can't diagnose your skin type or any skin condition."
      />

      <div className="container-page py-12">
        <Notice tone="warning" title="Not medical advice">
          This page offers general cosmetic information only. For persistent skin concerns, reactions or medical conditions, please consult a
          dermatologist or another qualified healthcare professional.
        </Notice>
      </div>

      <section className="container-page grid gap-6 pb-16 md:grid-cols-2" aria-label="Skin types">
        {skinTypes.map((s) => {
          const count = products.filter((p) => p.skinTypeIds.includes(s.id)).length;
          return (
            <article key={s.id} id={s.id} className="flex scroll-mt-24 flex-col rounded-lg border border-line bg-milk p-8 sm:p-10">
              <h2 className="text-h2 text-ink">{s.label}</h2>
              <p className="mt-4 flex-1 leading-relaxed text-ink-soft">{s.description}</p>
              <ButtonLink href={`/shop?skin=${s.id}`} variant="ghost" className="mt-8 self-start">
                Products positioned for {s.label.toLowerCase()} ({count})
              </ButtonLink>
            </article>
          );
        })}
      </section>

      <section className="border-t hairline bg-milk py-[var(--spacing-section)]" aria-labelledby="precautions">
        <div className="container-page">
          <h2 id="precautions" className="text-h2 text-ink">
            General precautions for any new product
          </h2>
          <ol className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-2 lg:grid-cols-3">
            {precautions.map((p, i) => (
              <li key={p.title} className="border-t hairline pt-5">
                <p className="font-display text-3xl text-blush-deep">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-2 text-lg font-semibold text-ink">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
