import { useId, type ComponentProps } from "react";

const control =
  "w-full rounded-md border bg-milk px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-muted/70 hover:border-ink/40 focus-visible:border-ink aria-[invalid=true]:border-danger";

function Label({ htmlFor, label, required }: { htmlFor: string; label: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
      {label}
      {required && (
        <span className="ml-0.5 text-danger" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

function ErrorText({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  if (error)
    return (
      <p id={`${id}-msg`} className="mt-1.5 text-xs font-medium text-danger">
        {error}
      </p>
    );
  if (hint)
    return (
      <p id={`${id}-msg`} className="mt-1.5 text-xs text-ink-muted">
        {hint}
      </p>
    );
  return null;
}

export function Field({ label, error, hint, className = "", ...props }: ComponentProps<"input"> & { label: string; error?: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={props.required} />
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} h-12 ${error ? "border-danger" : "border-line"}`}
        {...props}
      />
      <ErrorText id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextArea({ label, error, hint, className = "", ...props }: ComponentProps<"textarea"> & { label: string; error?: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={props.required} />
      <textarea
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} py-3 ${error ? "border-danger" : "border-line"}`}
        {...props}
      />
      <ErrorText id={id} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  className = "",
  children,
  ...props
}: ComponentProps<"select"> & { label: string; error?: string; hint?: string }) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return (
    <div className={className}>
      <Label htmlFor={id} label={label} required={props.required} />
      <select
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-msg` : undefined}
        className={`${control} h-12 ${error ? "border-danger" : "border-line"}`}
        {...props}
      >
        {children}
      </select>
      <ErrorText id={id} error={error} hint={hint} />
    </div>
  );
}
