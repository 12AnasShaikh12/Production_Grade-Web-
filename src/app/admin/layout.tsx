import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Amros Beauty Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-pearl/40">
      <header className="border-b hairline bg-milk">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/admin" className="font-display text-xl tracking-[0.2em] text-ink uppercase">
            Amros <span className="text-sm tracking-[0.3em] text-ink-muted">Admin</span>
          </Link>
          <Link href="/" className="text-sm font-semibold text-ink-soft hover:text-ink">
            View storefront →
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
