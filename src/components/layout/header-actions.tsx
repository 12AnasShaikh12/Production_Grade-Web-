"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/cart-store";
import { primaryNav } from "./nav";

const iconBtn =
  "relative grid size-11 place-items-center rounded-full text-ink transition-colors hover:bg-pearl focus-visible:bg-pearl";

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" strokeLinecap="round" />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M5.5 8.5h13l-1 11.5h-11z" strokeLinejoin="round" />
      <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" strokeLinecap="round" />
    </svg>
  );
}

export function HeaderActions({ brandName }: { brandName: string }) {
  const { count, hydrated } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={iconBtn} aria-label="Search products" onClick={() => setSearchOpen(true)}>
        <SearchIcon />
      </button>
      <Link href="/cart" className={iconBtn} aria-label={hydrated && count > 0 ? `Bag, ${count} item${count === 1 ? "" : "s"}` : "Bag"}>
        <BagIcon />
        {hydrated && count > 0 && (
          <span className="absolute right-1 top-1 grid min-w-[1.15rem] place-items-center rounded-full bg-blush-deep px-1 text-[0.65rem] font-bold leading-[1.15rem] text-milk">
            {count}
          </span>
        )}
      </Link>
      <button
        type="button"
        className={`${iconBtn} lg:hidden`}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="mobile-menu"
        onClick={() => setMenuOpen(true)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M4 8h16M4 16h11" />
        </svg>
      </button>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} brandName={brandName} />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const node = ref.current;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && node) {
        const focusables = node.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input, select, textarea, [tabindex="0"]');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

function MobileMenu({ open, onClose, brandName }: { open: boolean; onClose: () => void; brandName: string }) {
  const ref = useDialog(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-50 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close menu" tabIndex={-1} className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} />
          <m.div
            ref={ref}
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="absolute inset-y-0 right-0 flex w-[min(24rem,88vw)] flex-col bg-milk-glow shadow-lift"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex h-[4.5rem] items-center justify-between px-6">
              <span className="eyebrow">{brandName}</span>
              <button type="button" data-autofocus className={iconBtn} aria-label="Close menu" onClick={onClose}>
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-6 pb-10">
              <ul className="space-y-1">
                {[...primaryNav, { href: "/contact", label: "Contact" }, { href: "/cart", label: "Your bag" }].map((item, i) => (
                  <m.li
                    key={item.href}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.08 + i * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link href={item.href} onClick={onClose} className="block border-b hairline py-4 font-display text-3xl text-ink transition-colors hover:text-blush-deep">
                      {item.label}
                    </Link>
                  </m.li>
                ))}
              </ul>
            </nav>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useDialog(open, onClose);
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <AnimatePresence>
      {open && (
        <m.div className="fixed inset-0 z-50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Close search" tabIndex={-1} className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} />
          <m.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-label="Search products"
            className="relative mx-auto mt-[12vh] w-[min(40rem,calc(100vw-2rem))] rounded-lg bg-milk p-6 shadow-lift"
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <form
              role="search"
              onSubmit={(e) => {
                e.preventDefault();
                const term = q.trim().slice(0, 80);
                router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
                onClose();
              }}
            >
              <label htmlFor="site-search" className="eyebrow">
                Search the collection
              </label>
              <div className="mt-3 flex items-center gap-3 border-b border-ink/30 pb-2 focus-within:border-ink">
                <SearchIcon />
                <input
                  id="site-search"
                  data-autofocus
                  type="search"
                  value={q}
                  maxLength={80}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Try “vitamin c” or “cream”"
                  className="w-full bg-transparent py-2 font-display text-2xl outline-none placeholder:text-ink-muted/70"
                />
                <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-milk">
                  Search
                </button>
              </div>
            </form>
            <button type="button" onClick={onClose} className="mt-4 text-sm text-ink-soft underline-offset-4 hover:underline">
              Close
            </button>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
