import Link from "next/link";
import { Wordmark } from "./wordmark";
import { primaryNav } from "./nav";
import { HeaderActions } from "./header-actions";

export function SiteHeader({ brandName }: { brandName: string }) {
  return (
    <header className="surface-frost sticky top-0 z-40 border-x-0 border-t-0">
      <div className="container-page flex h-[4.5rem] items-center justify-between gap-6">
        <Wordmark brandName={brandName} />
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative py-2 text-sm font-medium text-ink-soft transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-blush-deep after:transition-transform after:duration-300 hover:text-ink hover:after:scale-x-100"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <HeaderActions brandName={brandName} />
      </div>
    </header>
  );
}
