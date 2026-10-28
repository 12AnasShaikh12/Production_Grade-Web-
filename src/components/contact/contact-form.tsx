"use client";

import { useState } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Field, TextArea } from "@/components/ui/field";

type Status = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "error"; message: string };

export function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (status.kind === "sent") {
    return (
      <div role="status" className="rounded-lg border border-success/30 bg-success-soft p-8">
        <p className="font-display text-2xl text-ink">Thank you — your message has been sent.</p>
        <p className="mt-2 text-sm text-ink-soft">Our team will reply to the email address you provided.</p>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        setStatus({ kind: "sending" });
        setErrors({});
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Object.fromEntries(form)),
          });
          const data = (await res.json().catch(() => ({}))) as { error?: string; fieldErrors?: Record<string, string> };
          if (!res.ok) {
            setErrors(data.fieldErrors ?? {});
            setStatus({ kind: "error", message: data.error ?? "Something went wrong." });
            return;
          }
          setStatus({ kind: "sent" });
        } catch {
          setStatus({ kind: "error", message: `We couldn't reach the server. Please email ${email} instead.` });
        }
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" name="name" autoComplete="name" required error={errors.name} />
        <Field label="Email" name="email" type="email" autoComplete="email" required error={errors.email} />
      </div>
      <Field label="Phone (optional)" name="phone" type="tel" autoComplete="tel" error={errors.phone} />
      <TextArea label="Message" name="message" rows={5} required maxLength={2000} error={errors.message} />
      <div aria-hidden="true" className="hidden">
        <label>
          Leave this empty
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-sm font-medium text-danger">
          {status.message}
        </p>
      )}
      <button type="submit" disabled={status.kind === "sending"} className={buttonClasses("primary", "lg")}>
        {status.kind === "sending" ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
