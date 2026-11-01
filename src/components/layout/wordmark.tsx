"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Wordmark({ brandName, className = "" }: { brandName: string; className?: string }) {
  const [first, ...rest] = brandName.split(" ");
  const pathname = usePathname();
  return (
    <Link
      href="/"
      onClick={(e) => {
        if (pathname === "/") {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }}
      className={`group inline-flex flex-col leading-none ${className}`}
      aria-label={`${brandName} — home`}
    >
      <span className="font-display text-[1.65rem] font-medium uppercase tracking-[0.28em] text-ink transition-colors group-hover:text-blush-deep">
        {first}
      </span>
      {rest.length > 0 && (
        <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.62em] text-ink-muted">{rest.join(" ")}</span>
      )}
    </Link>
  );
}
