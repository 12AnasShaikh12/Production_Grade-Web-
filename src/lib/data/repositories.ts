import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/lib/config/env";
import { parseSiteContent, type SiteContent } from "@/lib/content/schemas";
import { getSeedContent } from "@/lib/content/seed";
import { getServiceClient } from "@/lib/supabase/service";
import { applyMutation, type ContentMutation } from "./mutations";

export type RepositoryKind = "supabase" | "local" | "seed";

export interface ContentRepository {
  readonly kind: RepositoryKind;
  readonly writable: boolean;
  load(): Promise<SiteContent>;
  /** Persists the mutation and returns the resulting validated content. */
  mutate(mutation: ContentMutation): Promise<SiteContent>;
}

export class ReadOnlyRepositoryError extends Error {
  constructor() {
    super("Content persistence is not configured. Configure Supabase to edit content in this environment.");
    this.name = "ReadOnlyRepositoryError";
  }
}

// ---------------------------------------------------------------------------------------------
// Seed (read-only) — production without a database
// ---------------------------------------------------------------------------------------------

export class SeedRepository implements ContentRepository {
  readonly kind = "seed" as const;
  readonly writable = false;
  async load() {
    return getSeedContent();
  }
  async mutate(): Promise<SiteContent> {
    throw new ReadOnlyRepositoryError();
  }
}

// ---------------------------------------------------------------------------------------------
// Local JSON file — development and single-server setups
// ---------------------------------------------------------------------------------------------

export class LocalFileRepository implements ContentRepository {
  readonly kind = "local" as const;
  readonly writable = true;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  async load(): Promise<SiteContent> {
    try {
      const text = await readFile(this.filePath, "utf8");
      return parseSiteContent(JSON.parse(text));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const seed = getSeedContent();
        await this.write(seed);
        return seed;
      }
      throw error;
    }
  }

  mutate(mutation: ContentMutation): Promise<SiteContent> {
    // Serialise writes so concurrent admin saves cannot interleave read-modify-write cycles.
    const run = this.queue.then(async () => {
      const next = applyMutation(await this.load(), mutation);
      await this.write(next);
      return next;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async write(content: SiteContent) {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const tmp = `${this.filePath}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(content, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }
}

// ---------------------------------------------------------------------------------------------
// Supabase PostgreSQL
// ---------------------------------------------------------------------------------------------

type Row = Record<string, unknown>;

export class SupabaseRepository implements ContentRepository {
  readonly kind = "supabase" as const;
  readonly writable = true;

  constructor(private readonly db: SupabaseClient) {}

  async load(): Promise<SiteContent> {
    const q = async (table: string, order?: string) => {
      let query = this.db.from(table).select("*");
      if (order) query = query.order(order, { ascending: true });
      const { data, error } = await query;
      if (error) throw new Error(`Supabase read failed for ${table}: ${error.message}`);
      return (data ?? []) as Row[];
    };
    const [settings, categories, skinTypes, ingredients, products, faqs, policies, knowledge] = await Promise.all([
      q("site_settings"),
      q("categories", "sort_order"),
      q("skin_types", "sort_order"),
      q("ingredients", "id"),
      q("products", "created_at"),
      q("faqs", "sort_order"),
      q("policies", "slug"),
      q("knowledge_documents", "id"),
    ]);
    const setting = (key: string) => settings.find((s) => s.key === key)?.value;
    if (!setting("brand")) throw new Error("Supabase is reachable but has not been seeded (run `npm run db:seed`).");

    const latest = [...settings, ...products, ...faqs]
      .map((r) => String(r.updated_at ?? ""))
      .sort()
      .at(-1);

    return parseSiteContent({
      version: 1,
      updatedAt: latest ? new Date(latest).toISOString() : new Date(0).toISOString(),
      brand: setting("brand"),
      fallbacks: setting("fallbacks"),
      commerce: setting("commerce"),
      categories: categories.map(fromCategoryRow),
      skinTypes: skinTypes.map((r) => ({ id: r.id, label: r.label, description: r.description, sortOrder: r.sort_order })),
      ingredients: ingredients.map(fromIngredientRow),
      products: products.map(fromProductRow),
      faqs: faqs.map((r) => ({
        id: r.id,
        question: r.question,
        answer: r.answer,
        category: r.category,
        sortOrder: r.sort_order,
        approved: r.approved,
        updatedAt: iso(r.updated_at),
      })),
      policies: policies.map((r) => ({
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        body: r.body,
        status: r.status,
        updatedAt: iso(r.updated_at),
      })),
      knowledge: knowledge.map((r) => ({
        id: r.id,
        docType: r.doc_type,
        title: r.title,
        content: r.content,
        approved: r.approved,
        active: r.active,
        source: r.source,
        updatedAt: iso(r.updated_at),
      })),
    });
  }

  async mutate(mutation: ContentMutation): Promise<SiteContent> {
    // Validate against the full current document first so integrity rules are enforced.
    const next = applyMutation(await this.load(), mutation);
    const m = mutation;
    const check = (r: { error: { message: string } | null }) => {
      if (r.error) throw new Error(`Supabase write failed: ${r.error.message}`);
    };
    switch (m.type) {
      case "product": {
        const p = next.products.find((x) => x.id === m.value.id)!;
        check(await this.db.from("products").upsert(toProductRow(p)));
        break;
      }
      case "categories":
        check(await this.db.from("categories").upsert(next.categories.map(toCategoryRow)));
        break;
      case "skinTypes":
        check(
          await this.db
            .from("skin_types")
            .upsert(next.skinTypes.map((s) => ({ id: s.id, label: s.label, description: s.description, sort_order: s.sortOrder }))),
        );
        break;
      case "ingredients":
        check(await this.db.from("ingredients").upsert(next.ingredients.map(toIngredientRow)));
        break;
      case "faq": {
        const f = m.value;
        check(
          await this.db.from("faqs").upsert({
            id: f.id,
            question: f.question,
            answer: f.answer,
            category: f.category,
            sort_order: f.sortOrder,
            approved: f.approved,
            updated_at: f.updatedAt,
          }),
        );
        break;
      }
      case "deleteFaq":
        check(await this.db.from("faqs").delete().eq("id", m.id));
        break;
      case "policy": {
        const p = m.value;
        check(
          await this.db
            .from("policies")
            .upsert({ slug: p.slug, title: p.title, summary: p.summary, body: p.body, status: p.status, updated_at: p.updatedAt }),
        );
        break;
      }
      case "knowledge": {
        const k = m.value;
        check(
          await this.db.from("knowledge_documents").upsert({
            id: k.id,
            doc_type: k.docType,
            title: k.title,
            content: k.content,
            approved: k.approved,
            active: k.active,
            source: k.source,
            updated_at: k.updatedAt,
          }),
        );
        break;
      }
      case "deleteKnowledge":
        check(await this.db.from("knowledge_documents").delete().eq("id", m.id));
        break;
      case "brand":
      case "fallbacks":
      case "commerce":
        check(await this.db.from("site_settings").upsert({ key: m.type, value: m.value, updated_at: next.updatedAt }));
        break;
    }
    return next;
  }

  /** Writes an entire content document (used by the seed script). */
  async replaceAll(content: SiteContent): Promise<void> {
    const c = parseSiteContent(content);
    const check = (r: { error: { message: string } | null }, what: string) => {
      if (r.error) throw new Error(`Seeding ${what} failed: ${r.error.message}`);
    };
    check(
      await this.db.from("site_settings").upsert([
        { key: "brand", value: c.brand },
        { key: "fallbacks", value: c.fallbacks },
        { key: "commerce", value: c.commerce },
      ]),
      "settings",
    );
    check(await this.db.from("categories").upsert(c.categories.map(toCategoryRow)), "categories");
    check(
      await this.db
        .from("skin_types")
        .upsert(c.skinTypes.map((s) => ({ id: s.id, label: s.label, description: s.description, sort_order: s.sortOrder }))),
      "skin types",
    );
    check(await this.db.from("ingredients").upsert(c.ingredients.map(toIngredientRow)), "ingredients");
    check(await this.db.from("products").upsert(c.products.map(toProductRow)), "products");
    check(
      await this.db.from("faqs").upsert(
        c.faqs.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          category: f.category,
          sort_order: f.sortOrder,
          approved: f.approved,
          updated_at: f.updatedAt,
        })),
      ),
      "faqs",
    );
    check(
      await this.db
        .from("policies")
        .upsert(c.policies.map((p) => ({ slug: p.slug, title: p.title, summary: p.summary, body: p.body, status: p.status, updated_at: p.updatedAt }))),
      "policies",
    );
    check(
      await this.db.from("knowledge_documents").upsert(
        c.knowledge.map((k) => ({
          id: k.id,
          doc_type: k.docType,
          title: k.title,
          content: k.content,
          approved: k.approved,
          active: k.active,
          source: k.source,
          updated_at: k.updatedAt,
        })),
      ),
      "knowledge",
    );
  }
}

function iso(v: unknown): string {
  return new Date(String(v)).toISOString();
}

function fromCategoryRow(r: Row) {
  return {
    id: r.id,
    label: r.label,
    ownerLabel: r.owner_label,
    description: r.description,
    sortOrder: r.sort_order,
    labelApproved: r.label_approved,
    isAll: r.is_all,
  };
}

function toCategoryRow(c: SiteContent["categories"][number]) {
  return {
    id: c.id,
    label: c.label,
    owner_label: c.ownerLabel,
    description: c.description,
    sort_order: c.sortOrder,
    label_approved: c.labelApproved,
    is_all: c.isAll,
  };
}

function fromIngredientRow(r: Row) {
  return {
    id: r.id,
    name: r.name,
    suppliedName: r.supplied_name,
    role: r.role,
    generalInfo: r.general_info,
    verifiedProductNote: r.verified_product_note,
    image: r.image,
    approved: r.approved,
  };
}

function toIngredientRow(i: SiteContent["ingredients"][number]) {
  return {
    id: i.id,
    name: i.name,
    supplied_name: i.suppliedName,
    role: i.role,
    general_info: i.generalInfo,
    verified_product_note: i.verifiedProductNote,
    image: i.image,
    approved: i.approved,
  };
}

function fromProductRow(r: Row) {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    tagline: r.tagline,
    shortDescription: r.short_description,
    description: r.description,
    pricePaise: r.price_paise,
    currency: r.currency,
    sizeLabel: r.size_label,
    images: r.images,
    ingredientIds: r.ingredient_ids,
    fullIngredientDeclaration: r.full_ingredient_declaration,
    benefits: r.benefits,
    categoryIds: r.category_ids,
    skinTypeIds: r.skin_type_ids,
    usageInstructions: r.usage_instructions,
    safetyNotes: r.safety_notes,
    status: r.status,
    availability: r.availability,
    seoTitle: r.seo_title,
    seoDescription: r.seo_description,
    claimsApproved: r.claims_approved,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

function toProductRow(p: SiteContent["products"][number]) {
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    short_name: p.shortName,
    tagline: p.tagline,
    short_description: p.shortDescription,
    description: p.description,
    price_paise: p.pricePaise,
    currency: p.currency,
    size_label: p.sizeLabel,
    images: p.images,
    ingredient_ids: p.ingredientIds,
    full_ingredient_declaration: p.fullIngredientDeclaration,
    benefits: p.benefits,
    category_ids: p.categoryIds,
    skin_type_ids: p.skinTypeIds,
    usage_instructions: p.usageInstructions,
    safety_notes: p.safetyNotes,
    status: p.status,
    availability: p.availability,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
    claims_approved: p.claimsApproved,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

// ---------------------------------------------------------------------------------------------
// Selection
// ---------------------------------------------------------------------------------------------

let override: ContentRepository | undefined;
let local: LocalFileRepository | undefined;

/** Test hook. */
export function setRepositoryForTesting(repo: ContentRepository | undefined) {
  override = repo;
}

export function getRepository(): ContentRepository {
  if (override) return override;
  const env = getEnv();
  const db = getServiceClient();
  if (db) return new SupabaseRepository(db);
  if (env.localStore.enabled) {
    if (!local) local = new LocalFileRepository(path.resolve(/*turbopackIgnore: true*/ process.cwd(), env.localStore.path));
    return local;
  }
  return new SeedRepository();
}
