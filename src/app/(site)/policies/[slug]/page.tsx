import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Notice, PageHero } from "@/components/ui/primitives";
import { policySlug, type SiteContent } from "@/lib/content/schemas";
import { getSiteContent } from "@/lib/data/catalog";

export function generateStaticParams() {
  return policySlug.options.map((slug) => ({ slug }));
}

async function getPolicy(slug: string) {
  const content = await getSiteContent();
  return { content, policy: content.policies.find((p) => p.slug === slug) };
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const { policy } = await getPolicy(slug);
  if (!policy) return { title: "Policy not found" };
  return {
    title: policy.title,
    description: policy.summary,
    alternates: { canonical: `/policies/${policy.slug}` },
    robots: policy.status === "approved" ? undefined : { index: false },
  };
}

export default function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  return (
    <Suspense fallback={<div className="container-page py-20" aria-hidden="true"><div className="skeleton h-72" /></div>}>
      <PolicyContent params={params} />
    </Suspense>
  );
}

async function PolicyContent({ params }: { params: PageProps<"/policies/[slug]">["params"] }) {
  const { slug } = await params;
  const { content, policy } = await getPolicy(slug);
  if (!policy) notFound();
  const published = policy.status === "approved" && policy.body;

  return (
    <>
      <PageHero eyebrow="Customer policies" title={policy.title} intro={policy.summary} />
      <article className="container-page max-w-3xl py-14">
        {published ? (
          <div className="prose-amros text-[1.02rem]">
            {policy.body!.split(/\n{2,}/).map((block, i) =>
              block.startsWith("## ") ? <h2 key={i}>{block.slice(3)}</h2> : <p key={i}>{block}</p>,
            )}
            <p className="text-sm text-ink-muted">Last updated {new Date(policy.updatedAt).toLocaleDateString("en-IN", { dateStyle: "long" })}.</p>
          </div>
        ) : (
          <div className="space-y-8">
            <Notice tone="warning" title="This policy is being finalised">
              The Amros Beauty team hasn&apos;t published this policy yet, so we won&apos;t show terms that haven&apos;t been confirmed. Please contact us
              before ordering if you need details.
            </Notice>
            <ContactBlock content={content} />
          </div>
        )}
        {policy.slug === "privacy" && <WebsiteDataNotice />}
        <nav aria-label="Other policies" className="mt-14 border-t hairline pt-8">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {content.policies
              .filter((p) => p.slug !== policy.slug)
              .map((p) => (
                <li key={p.slug}>
                  <Link href={`/policies/${p.slug}`} className="font-semibold text-ink underline-offset-4 hover:underline">
                    {p.title}
                  </Link>
                </li>
              ))}
          </ul>
        </nav>
      </article>
    </>
  );
}

function ContactBlock({ content }: { content: SiteContent }) {
  const { brand } = content;
  return (
    <p className="leading-relaxed text-ink-soft">
      Email{" "}
      <a className="font-semibold text-ink underline underline-offset-4" href={`mailto:${brand.email}`}>
        {brand.email}
      </a>{" "}
      or call{" "}
      <a className="font-semibold text-ink underline underline-offset-4" href={`tel:${brand.phoneE164}`}>
        {brand.phoneDisplay}
      </a>
      .
    </p>
  );
}

/** Factual description of what this website itself processes (not a substitute for a legal policy). */
function WebsiteDataNotice() {
  return (
    <section className="prose-amros mt-12 rounded-lg border border-line bg-milk p-8" aria-labelledby="site-data">
      <h2 id="site-data" className="!mt-0">
        What this website currently handles
      </h2>
      <ul>
        <li>Your shopping bag is stored in your own browser (local storage) and is not sent to us until you check out.</li>
        <li>
          Questions you type into the website assistant are sent to our server and, when the AI service is enabled, to NVIDIA&apos;s API to generate an
          answer. Please don&apos;t share personal or medical details in the chat.
        </li>
        <li>If online ordering is enabled, the delivery details you enter are used to process your order, and payments are handled by our payment provider.</li>
        <li>If you email or call us, we receive the details you choose to share.</li>
      </ul>
    </section>
  );
}
