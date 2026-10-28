"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { initialActionState, type ActionState } from "@/lib/admin/operations";
import { buttonClasses } from "@/components/ui/button";

type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>;

function Submit({ label, variant = "primary" }: { label: string; variant?: "primary" | "ghost" }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, "sm")}>
      {pending ? "Working…" : label}
    </button>
  );
}

export function ActionResult({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div
      role={state.ok ? "status" : "alert"}
      className={`rounded-md border px-4 py-3 text-sm ${state.ok ? "border-success/30 bg-success-soft" : "border-danger/30 bg-danger-soft"}`}
    >
      <p className="font-semibold text-ink">{state.message}</p>
      {state.warnings && state.warnings.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-ink-soft">
          {state.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Wraps server-rendered fields with a Server Action, pending state, result message and the
 * claim-substantiation confirmation step.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "Save changes",
  className = "",
  danger = false,
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, formAction] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className={`space-y-5 ${className}`}>
      {children}
      {state.needsClaimConfirmation && state.claimFlags && (
        <div className="rounded-md border border-citrus/50 bg-warning-soft p-4 text-sm">
          <p className="font-semibold text-ink">Claim review required</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
            {state.claimFlags.map((f) => (
              <li key={f.id}>
                <strong className="text-ink">“{f.match}”</strong> — {f.label}
              </li>
            ))}
          </ul>
          <label className="mt-3 flex items-start gap-2 font-medium text-ink">
            <input type="checkbox" name="confirmClaims" className="mt-1 size-4 accent-[var(--color-ink)]" />
            I confirm these statements are substantiated for the actual product and approved for publication.
          </label>
        </div>
      )}
      <ActionResult state={state} />
      <div className="flex items-center gap-3">
        <Submit label={submitLabel} variant={danger ? "ghost" : "primary"} />
      </div>
    </form>
  );
}

/** A single-button action (e.g. re-index) with result feedback. */
export function ActionButton({ action, label }: { action: () => Promise<ActionState>; label: string }) {
  const [state, formAction] = useActionState(async () => action(), initialActionState);
  return (
    <form action={formAction} className="space-y-3">
      <Submit label={label} variant="ghost" />
      <ActionResult state={state} />
    </form>
  );
}
