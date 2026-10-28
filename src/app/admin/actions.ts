"use server";

import { randomBytes } from "node:crypto";
import { updateTag } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuthMode, getAdminSession, isAuthorisedAdmin, supabaseAuthClient } from "@/lib/auth/admin";
import { createLocalSession, LOCAL_SESSION_COOKIE, LOCAL_SESSION_TTL_SECONDS, passwordMatches } from "@/lib/auth/session";
import { all, checked, integer, nullable, rows, slugify, text } from "@/lib/admin/form";
import { rupeesToPaise, saveContent, type ActionState } from "@/lib/admin/operations";
import { getNvidiaClient, reindexNow } from "@/lib/chat/runtime";
import { getEnv } from "@/lib/config/env";
import {
  fallbackIntent,
  type Category,
  type Commerce,
  type Faq,
  type FallbackIntent,
  type Ingredient,
  type KnowledgeDocument,
  type Policy,
  type Product,
  type SkinType,
} from "@/lib/content/schemas";
import { CONTENT_TAG } from "@/lib/data/catalog";
import { loadContent } from "@/lib/data/content";
import type { ContentMutation } from "@/lib/data/mutations";
import { getRepository } from "@/lib/data/repositories";
import { errorSummary, log } from "@/lib/log";
import { clientKey, RateLimiter } from "@/lib/security/rate-limit";

const loginLimiter = new RateLimiter(5, 10 * 60 * 1000);
const now = () => new Date().toISOString();

async function save(mutation: ContentMutation, claimTexts?: string[], confirmClaims?: boolean): Promise<ActionState> {
  const env = getEnv();
  return saveContent(
    {
      session: await getAdminSession(),
      repo: getRepository(),
      invalidate: () => updateTag(CONTENT_TAG),
      reindex: env.nvidia.embeddingsConfigured ? reindexNow : undefined,
    },
    mutation,
    { claimTexts, confirmClaims },
  );
}

// ---------------------------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------------------------

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const key = `login:${clientKey(await headers())}`;
  if (!loginLimiter.check(key).allowed) return { ok: false, message: "Too many sign-in attempts. Please wait 10 minutes." };

  const mode = adminAuthMode();
  if (mode === "supabase") {
    const email = text(fd, "email");
    const password = String(fd.get("password") ?? "");
    if (!email || !password) return { ok: false, message: "Enter your email and password." };
    const supabase = await supabaseAuthClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, message: "Incorrect email or password." };
    if (!(await isAuthorisedAdmin(data.user.id, data.user.email))) {
      await supabase.auth.signOut();
      log.warn("admin.login_denied");
      return { ok: false, message: "This account does not have admin access." };
    }
  } else if (mode === "local") {
    const env = getEnv();
    if (!passwordMatches(String(fd.get("password") ?? ""), env.admin.localPassword!)) {
      return { ok: false, message: "Incorrect password." };
    }
    (await cookies()).set(LOCAL_SESSION_COOKIE, createLocalSession(env.admin.sessionSecret!), {
      httpOnly: true,
      sameSite: "strict",
      secure: env.isProduction,
      path: "/",
      maxAge: LOCAL_SESSION_TTL_SECONDS,
    });
  } else {
    return { ok: false, message: "Admin sign-in is not configured. See the README → Admin access." };
  }
  log.info("admin.login", { mode });
  redirect("/admin");
}

export async function logoutAction() {
  if (adminAuthMode() === "supabase") {
    try {
      await (await supabaseAuthClient()).auth.signOut();
    } catch {
      // Ignore network failures; the cookie is cleared below regardless.
    }
  }
  (await cookies()).delete(LOCAL_SESSION_COOKIE);
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------------------------

export async function saveProductAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to make this change." };
  const { content } = await loadContent();
  const existingId = text(fd, "recordId");
  const existing = content.products.find((p) => p.id === existingId);
  const pricePaise = rupeesToPaise(text(fd, "price"));
  if (pricePaise === null || pricePaise <= 0) return { ok: false, message: "Enter a valid price in rupees, e.g. 499 or 499.50." };

  const images = rows(fd, "images")
    .filter((r) => r.src)
    .map((r) => ({
      src: r.src,
      alt: r.alt ?? "",
      width: Number(r.width) || 800,
      height: Number(r.height) || 1000,
      kind: (r.kind === "photo" ? "photo" : "concept") as "photo" | "concept",
    }));
  const benefits = rows(fd, "benefits")
    .filter((r) => r.title && r.text)
    .map((r) => ({ id: slugify(r.id || r.title), title: r.title, text: r.text, approved: r.approved === "on" }));

  const timestamp = now();
  const product: Product = {
    id: existing?.id ?? `prod_${randomBytes(6).toString("hex")}`,
    slug: slugify(text(fd, "slug") || text(fd, "name")),
    name: text(fd, "name"),
    shortName: text(fd, "shortName"),
    tagline: text(fd, "tagline"),
    shortDescription: text(fd, "shortDescription"),
    description: text(fd, "description"),
    pricePaise,
    currency: "INR",
    sizeLabel: nullable(fd, "sizeLabel"),
    images,
    ingredientIds: all(fd, "ingredientIds"),
    fullIngredientDeclaration: nullable(fd, "fullIngredientDeclaration"),
    benefits,
    categoryIds: all(fd, "categoryIds"),
    skinTypeIds: all(fd, "skinTypeIds"),
    usageInstructions: nullable(fd, "usageInstructions"),
    safetyNotes: text(fd, "safetyNotes"),
    status: text(fd, "status") as Product["status"],
    availability: text(fd, "availability") as Product["availability"],
    seoTitle: text(fd, "seoTitle"),
    seoDescription: text(fd, "seoDescription"),
    claimsApproved: checked(fd, "claimsApproved"),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
  const result = await save(
    { type: "product", value: product },
    [product.name, product.tagline, product.shortDescription, product.description, product.usageInstructions ?? "", ...benefits.map((b) => `${b.title} ${b.text}`)],
    checked(fd, "confirmClaims"),
  );
  if (result.ok && !existing) redirect(`/admin/products/${product.id}?created=1`);
  return result;
}

// ---------------------------------------------------------------------------------------------
// Taxonomy & ingredients
// ---------------------------------------------------------------------------------------------

export async function saveCategoriesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const categories: Category[] = rows(fd, "categories").map((r) => ({
    id: r.id,
    label: r.label,
    ownerLabel: r.ownerLabel || r.label,
    description: r.description,
    sortOrder: Number(r.sortOrder) || 0,
    labelApproved: r.labelApproved === "on",
    isAll: r.isAll === "true",
  }));
  return save({ type: "categories", value: categories }, categories.map((c) => `${c.label} ${c.description}`), checked(fd, "confirmClaims"));
}

export async function saveSkinTypesAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const skinTypes: SkinType[] = rows(fd, "skinTypes").map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    sortOrder: Number(r.sortOrder) || 0,
  }));
  return save({ type: "skinTypes", value: skinTypes }, skinTypes.map((s) => s.description), checked(fd, "confirmClaims"));
}

export async function saveIngredientsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const ingredients: Ingredient[] = rows(fd, "ingredients").map((r) => ({
    id: r.id || slugify(r.name),
    name: r.name,
    suppliedName: r.suppliedName || null,
    role: r.role,
    generalInfo: r.generalInfo,
    verifiedProductNote: r.verifiedProductNote || null,
    image: r.image || "/brand/texture-cream.svg",
    approved: r.approved === "on",
  }));
  return save(
    { type: "ingredients", value: ingredients },
    ingredients.flatMap((i) => [i.role, i.generalInfo, i.verifiedProductNote ?? ""]),
    checked(fd, "confirmClaims"),
  );
}

// ---------------------------------------------------------------------------------------------
// FAQs, policies, knowledge, fallbacks
// ---------------------------------------------------------------------------------------------

export async function saveFaqAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const faq: Faq = {
    id: text(fd, "recordId") || slugify(text(fd, "question")).slice(0, 60),
    question: text(fd, "question"),
    answer: text(fd, "answer"),
    category: text(fd, "category") as Faq["category"],
    sortOrder: integer(fd, "sortOrder", 500),
    approved: checked(fd, "approved"),
    updatedAt: now(),
  };
  return save({ type: "faq", value: faq }, [faq.question, faq.answer], checked(fd, "confirmClaims"));
}

export async function deleteFaqAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return save({ type: "deleteFaq", id: text(fd, "recordId") });
}

export async function savePolicyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const body = nullable(fd, "body");
  const status = text(fd, "status") as Policy["status"];
  if (status === "approved" && !body) return { ok: false, message: "An approved policy needs policy text." };
  const policy: Policy = {
    slug: text(fd, "slug") as Policy["slug"],
    title: text(fd, "title"),
    summary: text(fd, "summary"),
    body,
    status: body ? status : "missing",
    updatedAt: now(),
  };
  return save({ type: "policy", value: policy });
}

export async function saveKnowledgeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const doc: KnowledgeDocument = {
    id: text(fd, "recordId") || slugify(text(fd, "title")).slice(0, 60),
    docType: text(fd, "docType") as KnowledgeDocument["docType"],
    title: text(fd, "title"),
    content: text(fd, "content"),
    approved: checked(fd, "approved"),
    active: checked(fd, "active"),
    source: text(fd, "source") || "Admin",
    updatedAt: now(),
  };
  return save({ type: "knowledge", value: doc }, [doc.title, doc.content], checked(fd, "confirmClaims"));
}

export async function deleteKnowledgeAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return save({ type: "deleteKnowledge", id: text(fd, "recordId") });
}

export async function saveFallbacksAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const value = Object.fromEntries(
    fallbackIntent.options.map((intent) => [intent, text(fd, `fallback.${intent}`)]).filter(([, v]) => v),
  ) as Record<FallbackIntent, string>;
  return save({ type: "fallbacks", value }, Object.values(value), checked(fd, "confirmClaims"));
}

// ---------------------------------------------------------------------------------------------
// Brand & commerce settings
// ---------------------------------------------------------------------------------------------

export async function saveBrandAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return save(
    {
      type: "brand",
      value: {
        name: text(fd, "name"),
        tagline: text(fd, "tagline"),
        shortDescription: text(fd, "shortDescription"),
        email: text(fd, "email"),
        phoneDisplay: text(fd, "phoneDisplay"),
        phoneE164: text(fd, "phoneE164").replace(/\s/g, ""),
        instagramUrl: text(fd, "instagramUrl"),
        instagramHandle: text(fd, "instagramHandle"),
        country: "IN",
        currency: "INR",
        address: text(fd, "address") || null,
      },
    },
    [text(fd, "tagline"), text(fd, "shortDescription")],
    checked(fd, "confirmClaims"),
  );
}

export async function saveCommerceAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const money = (name: string) => {
    const raw = text(fd, name);
    if (!raw) return null;
    return rupeesToPaise(raw);
  };
  const shipping = money("shippingFee");
  const threshold = money("freeShippingThreshold");
  if ((text(fd, "shippingFee") && shipping === null) || (text(fd, "freeShippingThreshold") && threshold === null)) {
    return { ok: false, message: "Enter amounts in rupees, e.g. 60 or 999." };
  }
  const prefixesRaw = text(fd, "serviceablePincodes");
  const tax = text(fd, "pricesIncludeTax");
  const commerce: Commerce = {
    checkoutEnabled: checked(fd, "checkoutEnabled"),
    shippingFeePaise: shipping,
    freeShippingThresholdPaise: threshold,
    pricesIncludeTax: tax === "yes" ? true : tax === "no" ? false : null,
    deliveryEstimate: nullable(fd, "deliveryEstimate"),
    serviceablePincodePrefixes: prefixesRaw === "" ? null : prefixesRaw.toUpperCase() === "ALL" ? [] : prefixesRaw.split(/[\s,]+/).filter(Boolean),
    maxQuantityPerLine: integer(fd, "maxQuantityPerLine", 10),
  };
  return save({ type: "commerce", value: commerce });
}

// ---------------------------------------------------------------------------------------------
// Assistant maintenance
// ---------------------------------------------------------------------------------------------

export async function reindexAction(): Promise<ActionState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to do this." };
  if (!getEnv().nvidia.embeddingsConfigured) {
    return { ok: false, message: "Semantic indexing needs NVIDIA_API_KEY and NVIDIA_EMBEDDING_MODEL. Keyword retrieval is active meanwhile." };
  }
  const { content, degraded } = await loadContent();
  if (degraded) return { ok: false, message: "The content store is unreachable, so the index was not rebuilt." };
  try {
    const r = await reindexNow(content);
    return { ok: true, message: `Re-indexed ${r.documents} documents into ${r.chunks} chunks with ${r.model}.` };
  } catch (error) {
    log.warn("admin.reindex_failed", { error: errorSummary(error) });
    return { ok: false, message: `Re-indexing failed: ${errorSummary(error).replace(/^\w+: /, "")}` };
  }
}

export async function verifyNvidiaAction(): Promise<ActionState> {
  if (!(await getAdminSession())) return { ok: false, message: "You are not authorised to do this." };
  const env = getEnv();
  const client = getNvidiaClient();
  if (!client) return { ok: false, message: "NVIDIA_API_KEY is not configured." };
  try {
    const models = await client.listModels();
    const warnings: string[] = [];
    for (const [label, id] of [
      ["Chat model", env.nvidia.chatModel],
      ["Embedding model", env.nvidia.embeddingModel],
    ] as const) {
      if (!id) warnings.push(`${label} is not configured.`);
      else if (!models.includes(id)) warnings.push(`${label} "${id}" is not in the catalog returned for this key.`);
    }
    if (env.nvidia.chatModel) {
      try {
        await client.chat([{ role: "user", content: "Reply with the single word: ready" }], { maxTokens: 5 });
      } catch (error) {
        warnings.push(`Chat test call failed (${(error as { kind?: string }).kind ?? "error"}).`);
      }
    }
    if (env.nvidia.embeddingModel) {
      try {
        await client.embed(["connection test"], "query");
      } catch (error) {
        warnings.push(`Embedding test call failed (${(error as { kind?: string }).kind ?? "error"}).`);
      }
    }
    return warnings.length
      ? { ok: false, message: "NVIDIA connection checked with issues.", warnings }
      : { ok: true, message: `Connected. ${models.length} models available; configured chat and embedding models responded.` };
  } catch (error) {
    return { ok: false, message: `Could not reach NVIDIA: ${(error as { kind?: string }).kind ?? "error"}.` };
  }
}
