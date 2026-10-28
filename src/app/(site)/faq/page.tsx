import type { Metadata } from "next";
import { FaqBrowser } from "@/components/faq/faq-browser";
import { PageHero } from "@/components/ui/primitives";
import { approvedFaqs, renderFaq } from "@/lib/content/selectors";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers about Amros Beauty KMG: price, ingredient highlights, skin types, ordering and support.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const content = await getSiteContent();
  const faqs = approvedFaqs(content).map((f) => renderFaq(content, f));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <PageHero
        eyebrow="FAQ"
        title="Frequently asked questions"
        intro="Approved answers about KMG and our store. Can't find what you need? Ask the assistant or contact our team."
      />
      <section className="container-page py-12 sm:py-16">
        <FaqBrowser faqs={faqs} email={content.brand.email} />
      </section>
    </>
  );
}
