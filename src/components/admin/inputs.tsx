import type { ReactNode } from "react";

/** Uncontrolled admin inputs (server-rendered with defaultValue; submitted via Server Actions). */

const control = "w-full rounded-md border border-line bg-milk px-3 text-sm text-ink outline-none focus-visible:border-ink";

export function AText({
  label,
  name,
  defaultValue,
  required,
  hint,
  type = "text",
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | number | null;
  required?: boolean;
  hint?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
        {required && " *"}
      </span>
      <input name={name} type={type} defaultValue={defaultValue ?? ""} required={required} maxLength={maxLength} className={`${control} h-10`} />
      </label>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function AArea({
  label,
  name,
  defaultValue,
  rows = 4,
  required,
  hint,
  maxLength,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  rows?: number;
  required?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
        {required && " *"}
      </span>
      <textarea name={name} rows={rows} defaultValue={defaultValue ?? ""} required={required} maxLength={maxLength} className={`${control} py-2 leading-relaxed`} />
      </label>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
}

export function ACheck({ label, name, defaultChecked, value }: { label: ReactNode; name: string; defaultChecked?: boolean; value?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input type="checkbox" name={name} value={value ?? "on"} defaultChecked={defaultChecked} className="mt-0.5 size-4 accent-[var(--color-ink)]" />
      <span>{label}</span>
    </label>
  );
}

export function ASelect({
  label,
  name,
  defaultValue,
  options,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</span>
      <select name={name} defaultValue={defaultValue} className={`${control} h-10`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Panel({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-line bg-milk p-6">
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      {description && <div className="mt-1 text-sm text-ink-soft">{description}</div>}
      <div className="mt-5">{children}</div>
    </section>
  );
}
