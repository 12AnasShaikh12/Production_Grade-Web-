import Link from "next/link";
import type { SiteContent } from "@/lib/content/schemas";
import { Wordmark } from "./wordmark";
import { footerNav } from "./nav";

export function SiteFooter({ content }: { content: SiteContent }) {
  const { brand } = content;
  return (
    <footer className="mt-auto border-t hairline bg-pearl/60">
      <div className="container-page grid gap-12 py-16 md:grid-cols-[1.3fr_repeat(3,1fr)]">
        <div className="max-w-sm">
          <Wordmark brandName={brand.name} />
          <p className="mt-5 font-display text-2xl italic text-ink">{brand.tagline}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{brand.shortDescription}</p>
          <address className="mt-6 space-y-2 text-sm not-italic">
            {brand.address && <p className="block text-ink-soft">{brand.address}</p>}
            <a className="block text-ink underline-offset-4 hover:underline" href={`mailto:${brand.email}`}>
              {brand.email}
            </a>
            <a className="block text-ink underline-offset-4 hover:underline" href={`tel:${brand.phoneE164}`}>
              {brand.phoneDisplay}
            </a>
            <a
              className="inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline"
              href={brand.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Instagram {brand.instagramHandle}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </address>
        </div>
        {footerNav.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <p className="eyebrow mb-4 text-ink-muted">{group.title}</p>
            <ul className="space-y-3 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-ink-soft transition-colors hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t hairline">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-muted sm:flex-row sm:justify-between">
          <p>© {brand.name}. Prices in Indian Rupees (INR).</p>
          <p>Product imagery shows conceptual packaging. Cosmetic information only — not medical advice.</p>
        </div>
      </div>
    </footer>
  );
}
