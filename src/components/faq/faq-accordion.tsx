import type { Faq } from "@/lib/content/schemas";

export function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="border-t hairline">
      {faqs.map((f) => (
        <details key={f.id} id={`faq-${f.id}`} className="group border-b hairline">
          <summary className="flex items-start justify-between gap-6 py-5 text-left font-display text-xl text-ink transition-colors hover:text-blush-deep sm:text-2xl">
            {f.question}
            <span
              aria-hidden="true"
              className="mt-1 grid size-7 shrink-0 place-items-center rounded-full border border-line font-sans text-base transition-transform duration-300 group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="max-w-2xl pb-6 leading-relaxed text-ink-soft">{f.answer}</p>
        </details>
      ))}
    </div>
  );
}
