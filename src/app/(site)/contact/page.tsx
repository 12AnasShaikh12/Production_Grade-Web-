import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { Notice, PageHero } from "@/components/ui/primitives";
import { getEnv } from "@/lib/config/env";
import { getSiteContent } from "@/lib/data/catalog";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Amros Beauty by email, phone or Instagram.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const { brand } = await getSiteContent();
  const formEnabled = getEnv().contact.configured;

  const channels = [
    { label: "Email", value: brand.email, href: `mailto:${brand.email}`, note: "Best for product and order questions." },
    { label: "Phone", value: brand.phoneDisplay, href: `tel:${brand.phoneE164}`, note: "Call our team directly." },
    { label: "Instagram", value: brand.instagramHandle, href: brand.instagramUrl, note: "Follow along and send us a message.", external: true },
    ...(brand.address
      ? [
          {
            label: "Address",
            value: brand.address,
            href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(brand.address)}`,
            note: "Online brand — please contact us before planning a visit.",
            external: true,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title={
          <>
            We&apos;d love to <em className="italic text-blush-deep">hear from you</em>
          </>
        }
        intro="Questions about KMG, ingredients or ordering? Reach the Amros Beauty team directly."
      />
      <section className="container-page grid gap-14 py-[var(--spacing-section)] lg:grid-cols-[1fr_1.1fr]">
        <ul className="space-y-4">
          {channels.map((c) => (
            <li key={c.label}>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex items-center justify-between gap-6 rounded-lg border border-line bg-milk p-6 transition-shadow hover:shadow-lift"
              >
                <span>
                  <span className="eyebrow block">{c.label}</span>
                  <span className="mt-2 block break-all font-display text-2xl text-ink sm:text-3xl">{c.value}</span>
                  <span className="mt-1 block text-sm text-ink-muted">{c.note}</span>
                </span>
                <span aria-hidden="true" className="text-xl text-ink-muted transition-transform group-hover:translate-x-1">
                  →
                </span>
                {c.external && <span className="sr-only">(opens in a new tab)</span>}
              </a>
            </li>
          ))}
        </ul>

        <div>
          <h2 className="text-h2 text-ink">Send a message</h2>
          <div className="mt-6">
            {formEnabled ? (
              <ContactForm email={brand.email} />
            ) : (
              <Notice title="Online messages aren't available yet">
                Our website contact form hasn&apos;t been connected to an email service yet, so we won&apos;t ask you to submit one. Please email{" "}
                <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${brand.email}`}>
                  {brand.email}
                </a>{" "}
                or call{" "}
                <a className="font-semibold text-ink underline underline-offset-4" href={`tel:${brand.phoneE164}`}>
                  {brand.phoneDisplay}
                </a>{" "}
                and we&apos;ll get back to you.
              </Notice>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
