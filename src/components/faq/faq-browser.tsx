"use client";

import { useId, useMemo, useState } from "react";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import type { Faq, FaqCategory } from "@/lib/content/schemas";

const labels: Record<FaqCategory, string> = {
  product: "Product",
  ingredients: "Ingredients",
  skin: "Skin",
  orders: "Orders",
  support: "Support",
};

export function FaqBrowser({ faqs, email }: { faqs: Faq[]; email: string }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "all">("all");
  const id = useId();
  const categories = useMemo(() => [...new Set(faqs.map((f) => f.category))], [faqs]);

  const visible = faqs.filter((f) => {
    if (category !== "all" && f.category !== category) return false;
    const q = query.trim().toLowerCase();
    return !q || `${f.question} ${f.answer}`.toLowerCase().includes(q);
  });

  const chip = (active: boolean) =>
    `min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors ${active ? "border-ink bg-ink text-milk" : "border-line bg-milk text-ink-soft hover:border-ink/50 hover:text-ink"}`;

  return (
    <div className="grid gap-10 lg:grid-cols-[18rem_1fr]">
      <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
        <div>
          <label htmlFor={`${id}-q`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Search questions
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={query}
            maxLength={80}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. price, dry skin"
            className="h-12 w-full rounded-md border border-line bg-milk px-4 text-sm outline-none focus-visible:border-ink"
          />
        </div>
        <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={category === "all"} className={chip(category === "all")} onClick={() => setCategory("all")}>
            All
          </button>
          {categories.map((c) => (
            <button key={c} type="button" aria-pressed={category === c} className={chip(category === c)} onClick={() => setCategory(c)}>
              {labels[c]}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-4 text-sm text-ink-muted" role="status" aria-live="polite">
          {visible.length} {visible.length === 1 ? "question" : "questions"}
        </p>
        {visible.length > 0 ? (
          <FaqAccordion faqs={visible} />
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-milk p-10 text-center">
            <p className="font-display text-2xl text-ink">No questions match that search.</p>
            <p className="mt-2 text-sm text-ink-soft">
              Try another word, or email{" "}
              <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${email}`}>
                {email}
              </a>
              .
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
