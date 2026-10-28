"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "@/app/admin/actions";
import { initialActionState } from "@/lib/admin/operations";
import { buttonClasses } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={buttonClasses("primary", "md", "w-full")}>
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm({ mode }: { mode: "supabase" | "local" }) {
  const [state, action] = useActionState(loginAction, initialActionState);
  return (
    <form action={action} className="mt-6 space-y-5">
      {mode === "local" && (
        <p className="rounded-md bg-warning-soft px-4 py-3 text-xs text-ink-soft">Development password sign-in. Disabled automatically in production.</p>
      )}
      {mode === "supabase" && <Field label="Email" name="email" type="email" autoComplete="username" required />}
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      {state.message && (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.message}
        </p>
      )}
      <Submit />
    </form>
  );
}
