"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { defaultFilters, filtersToQuery, sortOptions, type ShopFilters, type SortId } from "@/lib/content/selectors";

interface Option {
  id: string;
  label: string;
}

const selectClass =
  "h-12 w-full appearance-none rounded-md border border-line bg-milk bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%232a2421' stroke-width='1.5'%3E%3Cpath d='m6 8 4 4 4-4'/%3E%3C/svg%3E\")] bg-[length:1.1rem] bg-[right_0.85rem_center] bg-no-repeat pl-4 pr-10 text-sm font-medium text-ink transition-colors hover:border-ink/40 focus-visible:border-ink";

/**
 * Filter bar. Every change is written to the URL (shareable state) and the server re-renders the
 * results via a soft navigation — no full page reload.
 */
export function ShopControls({
  filters,
  categories,
  skinTypes,
  resultCount,
  children,
}: {
  filters: ShopFilters;
  categories: Option[];
  skinTypes: Option[];
  resultCount: number;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  // Optimistic local copy so rapid successive changes merge instead of using stale server props.
  const [current, setCurrent] = useState(filters);
  const [synced, setSynced] = useState(filters);
  const [q, setQ] = useState(filters.q);
  const id = useId();
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Keep the search box in sync when the URL changes elsewhere (e.g. header search, back button).
  if (JSON.stringify(filters) !== JSON.stringify(synced)) {
    setSynced(filters);
    setCurrent(filters);
    if (filters.q !== current.q) setQ(filters.q);
  }

  useEffect(() => () => clearTimeout(debounce.current), []);

  const apply = (next: Partial<ShopFilters>) => {
    const merged = { ...current, ...next };
    setCurrent(merged);
    startTransition(() => {
      router.replace(`${pathname}${filtersToQuery(merged)}`, { scroll: false });
    });
  };

  const active = filters.category !== "all" || filters.skin !== "all" || filters.q !== "" || filters.sort !== "featured";
  const categoryLabel = categories.find((c) => c.id === filters.category)?.label;
  const skinLabel = skinTypes.find((s) => s.id === filters.skin)?.label;

  return (
    <div>
      <form
        role="search"
        aria-label="Filter products"
        className="grid gap-4 rounded-lg border border-line bg-pearl/40 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[1.3fr_1fr_1fr_1fr]"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(debounce.current);
          apply({ q: q.trim().slice(0, 80) });
        }}
      >
        <div className="sm:col-span-2 lg:col-span-1">
          <label htmlFor={`${id}-q`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Search
          </label>
          <input
            id={`${id}-q`}
            type="search"
            value={q}
            maxLength={80}
            placeholder="Product or ingredient"
            onChange={(e) => {
              const value = e.target.value;
              setQ(value);
              clearTimeout(debounce.current);
              debounce.current = setTimeout(() => apply({ q: value.trim().slice(0, 80) }), 350);
            }}
            className="h-12 w-full rounded-md border border-line bg-milk px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/80 hover:border-ink/40 focus-visible:border-ink"
          />
        </div>
        <div>
          <label htmlFor={`${id}-category`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Category
          </label>
          <select id={`${id}-category`} className={selectClass} value={current.category} onChange={(e) => apply({ category: e.target.value })}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-skin`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Skin type
          </label>
          <select id={`${id}-skin`} className={selectClass} value={current.skin} onChange={(e) => apply({ skin: e.target.value })}>
            <option value="all">All skin types</option>
            {skinTypes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-sort`} className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Sort by
          </label>
          <select id={`${id}-sort`} className={selectClass} value={current.sort} onChange={(e) => apply({ sort: e.target.value as SortId })}>
            {sortOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-soft" role="status" aria-live="polite">
          {pending ? (
            "Updating results…"
          ) : (
            <>
              <strong className="font-semibold text-ink">{resultCount}</strong> {resultCount === 1 ? "product" : "products"}
              {categoryLabel && filters.category !== "all" && <> in {categoryLabel}</>}
              {skinLabel && <> for {skinLabel.toLowerCase()}</>}
              {filters.q && <> matching “{filters.q}”</>}
            </>
          )}
        </p>
        {active && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              apply(defaultFilters);
            }}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink"
          >
            Clear all filters
          </button>
        )}
      </div>

      <div className={`mt-8 transition-opacity duration-300 ${pending ? "pointer-events-none opacity-50" : ""}`} aria-busy={pending}>
        {children}
      </div>
    </div>
  );
}
