"use client";

import { useId, useState } from "react";
import { normalizeQuantity } from "@/lib/cart/cart";

/**
 * Accessible quantity control. Rejects zero, negative, non-integer and above-maximum values;
 * invalid typed input shows an error and is never committed.
 */
export function QuantitySelector({
  value,
  onChange,
  max,
  label = "Quantity",
  compact = false,
}: {
  value: number;
  onChange: (next: number) => void;
  max: number;
  label?: string;
  compact?: boolean;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const commit = (raw: string) => {
    const q = normalizeQuantity(raw, max);
    if (q === null) {
      setError(`Enter a whole number from 1 to ${max}.`);
      return;
    }
    setError(null);
    setDraft(null);
    onChange(q);
  };

  const step = (delta: number) => {
    const next = value + delta;
    if (next >= 1 && next <= max) {
      setError(null);
      setDraft(null);
      onChange(next);
    }
  };

  const btn =
    "grid size-11 place-items-center text-lg text-ink transition-colors hover:bg-pearl disabled:cursor-not-allowed disabled:text-ink-muted/50 disabled:hover:bg-transparent";

  return (
    <div>
      <label htmlFor={id} className={compact ? "sr-only" : "mb-2 block text-sm font-semibold text-ink"}>
        {label}
      </label>
      <div className={`inline-flex items-center overflow-hidden rounded-full border bg-milk ${error ? "border-danger" : "border-line"}`}>
        <button type="button" className={btn} onClick={() => step(-1)} disabled={value <= 1} aria-label="Decrease quantity">
          −
        </button>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          className="h-11 w-12 border-x border-line bg-transparent text-center text-sm font-semibold outline-none focus-visible:bg-pearl"
          value={draft ?? String(value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => setDraft(e.target.value.slice(0, 3))}
          onBlur={(e) => draft !== null && commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit((e.target as HTMLInputElement).value);
            }
          }}
        />
        <button type="button" className={btn} onClick={() => step(1)} disabled={value >= max} aria-label="Increase quantity">
          +
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
