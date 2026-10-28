import { checkoutReadiness } from "@/lib/checkout/readiness";
import type { ServerEnv } from "@/lib/config/env";
import { findClaimFlags } from "@/lib/content/claims";
import type { SiteContent } from "@/lib/content/schemas";
import { activeProducts } from "@/lib/content/selectors";

export type ChecklistStatus = "done" | "todo" | "warning";

export interface ChecklistItem {
  id: string;
  area: "Credentials" | "Payments" | "Policies" | "Product data" | "Claims & labels" | "Content source";
  label: string;
  status: ChecklistStatus;
  detail?: string;
}

/** Launch-readiness checklist: everything still needed before live commerce. */
export function buildLaunchChecklist(content: SiteContent, env: ServerEnv, source: { kind: string; degraded: boolean }): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const add = (item: ChecklistItem) => items.push(item);
  const ok = (cond: boolean): ChecklistStatus => (cond ? "done" : "todo");

  add({
    id: "source",
    area: "Content source",
    label: `Content is served from: ${source.kind}`,
    status: source.degraded ? "warning" : source.kind === "supabase" ? "done" : "warning",
    detail: source.degraded
      ? "The configured database could not be reached; the bundled seed is being served."
      : source.kind === "supabase"
        ? undefined
        : "Production deployments should use Supabase so edits persist across servers.",
  });

  add({ id: "site-url", area: "Credentials", label: "Public site URL configured (NEXT_PUBLIC_SITE_URL)", status: ok(!env.siteUrl.includes("localhost")) });
  add({ id: "nvidia-key", area: "Credentials", label: "NVIDIA API key (NVIDIA_API_KEY)", status: ok(Boolean(env.nvidia.apiKey)) });
  add({ id: "nvidia-chat", area: "Credentials", label: "NVIDIA chat model (NVIDIA_CHAT_MODEL)", status: ok(Boolean(env.nvidia.chatModel)) });
  add({
    id: "nvidia-embed",
    area: "Credentials",
    label: "NVIDIA embedding model (NVIDIA_EMBEDDING_MODEL)",
    status: ok(Boolean(env.nvidia.embeddingModel)),
  });
  add({ id: "supabase", area: "Credentials", label: "Supabase database (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)", status: ok(env.supabase.configured) });
  add({ id: "supabase-auth", area: "Credentials", label: "Supabase Auth for admin sign-in (SUPABASE_ANON_KEY)", status: ok(env.supabase.authConfigured) });
  add({
    id: "contact-email",
    area: "Credentials",
    label: "Contact-form email delivery (RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL)",
    status: env.contact.configured ? "done" : "warning",
    detail: env.contact.configured ? undefined : "Optional — the contact page shows email and phone links instead.",
  });

  const readiness = checkoutReadiness(content, env);
  add({
    id: "live-payments",
    area: "Payments",
    label: "Live online payments",
    status: readiness.livePayments ? "done" : "todo",
    detail: readiness.livePayments ? "All prerequisites met." : readiness.adminReasons.join(" "),
  });

  for (const p of content.policies) {
    add({
      id: `policy-${p.slug}`,
      area: "Policies",
      label: `${p.title} policy approved and published`,
      status: ok(p.status === "approved" && Boolean(p.body)),
      detail: p.status === "approved" ? undefined : "Owner-supplied policy text is required. Have it reviewed before launch.",
    });
  }

  for (const product of content.products.filter((p) => p.status !== "archived")) {
    const n = product.shortName;
    add({ id: `${product.id}-inci`, area: "Product data", label: `${n}: full ingredient declaration`, status: ok(Boolean(product.fullIngredientDeclaration)) });
    add({ id: `${product.id}-usage`, area: "Product data", label: `${n}: verified directions for use`, status: ok(Boolean(product.usageInstructions)) });
    add({ id: `${product.id}-size`, area: "Product data", label: `${n}: pack size`, status: ok(Boolean(product.sizeLabel)) });
    add({ id: `${product.id}-stock`, area: "Product data", label: `${n}: availability confirmed`, status: ok(product.availability !== "unconfirmed") });
    add({
      id: `${product.id}-packaging`,
      area: "Product data",
      label: `${n}: real packaging photography`,
      status: product.images.some((i) => i.kind === "photo") ? "done" : "warning",
      detail: "Images are concept visualisations until the physical packaging is confirmed.",
    });
    add({
      id: `${product.id}-claims`,
      area: "Claims & labels",
      label: `${n}: owner sign-off of product copy and benefit statements`,
      status: ok(product.claimsApproved),
    });
    const flags = findClaimFlags([product.description, product.shortDescription, ...product.benefits.map((b) => b.text)].join("\n"));
    if (flags.length) {
      add({
        id: `${product.id}-flags`,
        area: "Claims & labels",
        label: `${n}: copy contains wording that needs substantiation`,
        status: "warning",
        detail: flags.map((f) => `"${f.match}" (${f.label})`).join("; "),
      });
    }
  }
  if (activeProducts(content).length === 0) add({ id: "no-products", area: "Product data", label: "At least one active product", status: "todo" });

  for (const c of content.categories.filter((c) => !c.labelApproved)) {
    add({
      id: `cat-${c.id}`,
      area: "Claims & labels",
      label: `Approve category label "${c.label}"`,
      status: "todo",
      detail: `Interpreted from the owner's wording "${c.ownerLabel}".`,
    });
  }
  for (const i of content.ingredients.filter((i) => i.suppliedName)) {
    add({
      id: `ing-${i.id}`,
      area: "Claims & labels",
      label: `Confirm ingredient spelling "${i.name}"`,
      status: "warning",
      detail: `Normalised from the supplied spelling "${i.suppliedName}".`,
    });
  }
  return items;
}
