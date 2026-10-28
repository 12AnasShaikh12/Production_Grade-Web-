"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

/** Route-level error boundary. Never shows internal error details to customers. */
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main id="main" className="container-page flex min-h-dvh flex-1 flex-col items-start justify-center py-20">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-4 text-h1 text-ink">We couldn&apos;t load this page</h1>
      <p className="mt-4 max-w-md text-ink-soft">Please try again. If the problem continues, our team is happy to help by email or phone.</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => retry()} className={buttonClasses("primary", "md")}>
          Try again
        </button>
        <Link href="/contact" className={buttonClasses("ghost", "md")}>
          Contact us
        </Link>
      </div>
    </main>
  );
}
