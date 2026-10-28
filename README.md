# Amros Beauty — storefront, admin and NVIDIA RAG assistant

A Next.js e-commerce site for **Amros Beauty KMG (Korean Magic Glow) Face Cream**: editorial storefront, data-driven catalogue with filters, persistent bag, validated Indian checkout, protected admin, and the **Amros Beauty Assistant**, a retrieval-augmented chatbot on NVIDIA's API with deterministic fallbacks.

> **Status:** the storefront, admin and chatbot fallbacks work out of the box. **Live payments, the database, AI answers and contact-form email are built but need credentials.** Store policies, shipping rules and several product facts must come from the owner before launch. See the [launch checklist](#launch-checklist).

---

## Contents

1. [What works without configuration](#what-works-without-configuration)
2. [Quick start](#quick-start)
3. [Scripts](#scripts)
4. [Environment variables](#environment-variables)
5. [Project structure](#project-structure)
6. [Content model and editing](#content-model-and-editing)
7. [Database setup (Supabase)](#database-setup-supabase)
8. [NVIDIA AI setup and the RAG pipeline](#nvidia-ai-setup-and-the-rag-pipeline)
9. [Payments (Razorpay)](#payments-razorpay)
10. [Admin access](#admin-access)
11. [Deployment](#deployment)
12. [Security and privacy](#security-and-privacy)
13. [Testing](#testing)
14. [Content normalisations and claim policy](#content-normalisations-and-claim-policy)
15. [Known limitations](#known-limitations)
16. [Launch checklist](#launch-checklist)

---

## What works without configuration

| Capability | No credentials | Needs |
|---|---|---|
| All public pages, navigation, responsive layout, animation | ✅ | — |
| Catalogue, category and skin-type filters, search, sort (URL-driven) | ✅ | — |
| Bag (persists in the browser) and server-priced quotes | ✅ | — |
| Checkout address validation and "email your order request" | ✅ | — |
| **Live online payment** | ❌ disabled, with an explanation | Razorpay keys, webhook secret, Supabase, `CHECKOUT_LIVE_PAYMENTS=true`, shipping fee, serviceable PIN codes, all four policies approved |
| Order confirmation pages | Show "not found" (no orders exist) | Supabase + payments |
| Chatbot deterministic answers (price, ingredients, skin types, contact…) | ✅ | — |
| **Chatbot AI answers (RAG)** | Falls back to deterministic answers | `NVIDIA_API_KEY`, `NVIDIA_CHAT_MODEL` (+ `NVIDIA_EMBEDDING_MODEL` for semantic retrieval) |
| Admin editing | ✅ in development (local JSON store + password) | Supabase Auth + database in production |
| Contact form | Hidden; email and phone links shown | `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` |

## Quick start

Requirements: Node.js 20.9+ (developed on Node 24) and npm.

```bash
npm install
cp .env.example .env.local      # optional — everything degrades safely without values
npm run dev                     # http://localhost:3000
```

For local admin access, set `ADMIN_LOCAL_PASSWORD` and a 32+ character `ADMIN_SESSION_SECRET` in `.env.local`, then open `/admin`. Edits are saved to `.data/content.json` (git-ignored).

Production build:

```bash
npm run build
npm start
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | ESLint (Next.js core-web-vitals + TypeScript rules) |
| `npm run typecheck` | Generates route types, then `tsc --noEmit` |
| `npm test` | Vitest unit and integration tests (no network, no credentials) |
| `npm run test:e2e` | Playwright browser tests (builds and starts a production server on port 3200) |
| `npm run check` | lint + typecheck + unit tests + build |
| `npm run db:seed` | Seed Supabase with the validated owner content (`--force` to overwrite) |
| `npm run rag:reindex` | Rebuild the pgvector knowledge index |
| `npm run nvidia:smoke` | Live NVIDIA smoke test (makes real API calls) |
| `node scripts/generate-assets.mjs` | Regenerate the original SVG illustration set in `public/brand/` |

## Environment variables

All variables are documented in [.env.example](.env.example). Only `NEXT_PUBLIC_SITE_URL` reaches the browser. Everything else is read server-side through [src/lib/config/env.ts](src/lib/config/env.ts), and none of it is logged.

| Variable | Where the value comes from |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Your production origin, e.g. `https://amrosbeauty.in` (canonical URLs, sitemap, structured data) |
| `APP_ENV` | `production` on live deployments. **Never set `development` publicly**, because it enables password login. |
| `NVIDIA_API_KEY` | build.nvidia.com → API key (`nvapi-…`) |
| `NVIDIA_BASE_URL` | Default `https://integrate.api.nvidia.com/v1` |
| `NVIDIA_CHAT_MODEL`, `NVIDIA_EMBEDDING_MODEL` | Model IDs from the NVIDIA catalogue ([see below](#choosing-models)) |
| `NVIDIA_EMBEDDING_INPUT_TYPE` | `query_passage` for NVIDIA retrieval embedders, `none` for models without `input_type` |
| `NVIDIA_TIMEOUT_MS`, `NVIDIA_MAX_RETRIES` | Request timeout (default 15 s) and bounded retries for 429/5xx/network errors (default 1) |
| `RAG_MIN_SIMILARITY`, `RAG_MIN_LEXICAL_SCORE`, `RAG_TOP_K` | Retrieval confidence thresholds and evidence count |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API. The service-role key is server-only. |
| `ADMIN_EMAILS` | Comma-separated staff emails allowed into `/admin` |
| `ADMIN_LOCAL_PASSWORD`, `ADMIN_SESSION_SECRET` | Development-only admin login (ignored in production) |
| `LOCAL_CONTENT_STORE`, `LOCAL_CONTENT_PATH` | Local JSON store for development edits (`auto` = on outside production) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay Dashboard → API Keys (test keys first) |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Dashboard → Webhooks |
| `CHECKOUT_LIVE_PAYMENTS` | Must be `true` to take real payments, together with all other prerequisites |
| `CHAT_RATE_LIMIT_MAX`, `CHAT_RATE_LIMIT_WINDOW_SECONDS`, `CHAT_MAX_MESSAGE_CHARS`, `FORM_RATE_LIMIT_MAX` | Abuse-protection limits |
| `RESEND_API_KEY`, `CONTACT_FROM_EMAIL`, `CONTACT_TO_EMAIL` | Optional contact-form delivery via Resend (verified sender domain required) |

## Project structure

```
src/
  app/
    (site)/               Public storefront (home, shop, products/[slug], about, ingredients,
                          skin-guide, faq, contact, cart, checkout, order/[id], policies/[slug])
    admin/                Login, protected dashboard and editors; actions.ts = Server Actions
    api/
      chat/               Chatbot endpoint (validation, rate limit, fallbacks)
      cart/quote/         Server-authoritative pricing
      checkout/order|verify/  Razorpay order creation and signature verification
      webhooks/razorpay/  Webhook (raw-body HMAC, idempotent)
      contact/            Contact form delivery (only when configured)
      admin/reindex/      Authenticated re-index endpoint
    sitemap.ts, robots.ts, opengraph-image.tsx, icon.svg
  components/             UI primitives, layout, home sections, shop, product, cart,
                          checkout, chat widget, admin form kit
  lib/
    content/              Zod schemas, seed (owner brief), selectors/filters, claim control
    data/                 Repositories (Supabase / local JSON / read-only seed), mutations, cache
    chat/                 NVIDIA client, knowledge builder, chunking, BM25, vector stores,
                          indexer, hybrid retrieval, prompt, output guard, intents, fallbacks,
                          orchestration service, runtime wiring
    checkout/             Pricing, readiness gate, Indian address schema
    payments/razorpay.ts  Orders API + HMAC verification
    orders/               Order persistence and visitor-scoped access tokens
    auth/                 Supabase Auth admin check, dev-only signed sessions
    admin/                Save pipeline, launch checklist, form helpers
    security/             Rate limiter
  proxy.ts                Refreshes Supabase Auth cookies on /admin (not an authorisation layer)
supabase/migrations/      Schema, RLS, pgvector, atomic re-index and order functions
scripts/                  seed, reindex, nvidia-smoke, generate-assets
tests/unit/               Vitest
tests/e2e/                Playwright
public/brand/             Original SVG illustration set (generated)
```

**Stack:** Next.js 16.4 (App Router, Cache Components, Turbopack), React 19.3, TypeScript 5, Tailwind CSS 4, Motion 14, Zod 4, Supabase JS 2 / SSR, Vitest 5, Playwright 1.64.

## Content model and editing

Everything customer-facing lives in one validated `SiteContent` document ([schemas.ts](src/lib/content/schemas.ts)): brand and contact details, categories, skin types, ingredients, products, FAQs, policies, owner knowledge documents, chatbot fallback copy and commerce rules. Contact details exist in exactly one record. Prices are integer **paise** (₹499 = `49900`), formatted with `Intl.NumberFormat("en-IN", { currency: "INR" })`.

- **Source of truth:** Supabase when configured. Otherwise a local JSON file in development, or the bundled seed (read-only) in production.
- **Resilience:** if the database is unreachable, the validated seed is served (and logged) so the site and chatbot keep working with known facts. Checkout refuses orders in this degraded state.
- **Caching:** storefront reads use `"use cache"` with tag `site-content`. Admin saves call `updateTag` so changes appear immediately. Direct database edits appear within about a minute.
- **FAQ and fallback placeholders:** `{productName}`, `{productShortName}`, `{price}`, `{ingredients}`, `{skinTypes}`, `{email}`, `{phone}`, `{instagram}` and `{brandName}` render from live records, so a price change can't leave a stale FAQ or chatbot answer.

## Database setup (Supabase)

1. Create a Supabase project.
2. Apply the migration: `supabase db push` with the Supabase CLI, or paste [`supabase/migrations/20261025000000_init.sql`](supabase/migrations/20261025000000_init.sql) into the SQL editor. It enables `vector` and `pgcrypto`, creates all tables with RLS, and adds the `match_knowledge_chunks`, `replace_knowledge_index` and `create_order` functions.
3. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.
4. Run `npm run db:seed`.
5. Create staff users in Supabase Auth (Authentication → Users). Grant access by adding their email to `ADMIN_EMAILS`, or by inserting into `admin_users`:
   ```sql
   insert into admin_users (user_id, email, role)
   select id, email, 'admin' from auth.users where email = 'owner@example.com';
   ```
6. With NVIDIA configured, run `npm run rag:reindex` (admin saves also re-index automatically).

RLS: anonymous clients can only read published catalogue rows. Orders, payments, knowledge, settings and admin tables have no public policies. The application accesses data server-side with the service-role key after its own authorisation checks.

## NVIDIA AI setup and the RAG pipeline

### Choosing models

Model availability changes, so verify IDs against the catalogue for **your** key. On 2026-10-25 the public catalogue (`GET https://integrate.api.nvidia.com/v1/models`) listed both defaults in `.env.example`:

- Chat: `nvidia/llama-3.1-nemotron-70b-instruct`. Any instruct chat model from the catalogue works through `/chat/completions`.
- Embeddings: `nvidia/llama-3.2-nv-embedqa-1b-v1`, which uses `input_type` query/passage. Other listed embedders include `nvidia/nv-embedqa-mistral-7b-v2` and `nvidia/nemotron-3.5-embed-1b`.

A catalogue listing doesn't guarantee that a model is callable with a given key or tier. **No live NVIDIA call was made during development because no key was available.** To verify:

```bash
npm run nvidia:smoke
```

This lists the catalogue, checks both IDs, embeds the knowledge base into an in-memory index, and asks four questions, including a fabrication probe and a prompt-injection probe. It prints the answer mode and retrieval method for each. Admin → Dashboard → **Verify NVIDIA models** runs a similar check from the deployed server.

### How a question is answered

1. **Validate:** Zod schema (strict keys, ≤ 500 characters, bounded history), 16 KB body limit, same-origin check, per-IP rate limit.
2. **Safety routing:** deterministic intent detection. Prompt-injection attempts get a fixed refusal. Medical and adverse-reaction questions get a cautious, non-diagnostic answer with a professional-referral message. Neither reaches the model.
3. **Knowledge:** records are derived from the structured content (brand, contact, product overview, price, ingredients, approved benefits, skin types, usage, FAQs, policies, commerce settings) plus owner knowledge documents. Each has an id, type, approval flag, active flag, source and timestamp. **Only approved and active records are chunked or indexed.**
4. **Hybrid retrieval:** NVIDIA query embedding → vector search (pgvector, or in-memory without Supabase), fused with BM25 lexical search by reciprocal-rank fusion. Every vector hit is re-checked against the live chunk set by **content version hash**, so a stale or unapproved vector can never be used as evidence.
5. **Confidence gate:** nothing above `RAG_MIN_SIMILARITY` / `RAG_MIN_LEXICAL_SCORE` → deterministic fallback, and the model is not called.
6. **Generation:** a grounded system prompt plus evidence in delimited blocks. User text and evidence are marked as untrusted input.
7. **Output validation:** the answer is rejected (→ fallback) if it is empty or too long, leaks secrets or config, quotes a ₹ amount or a % / mg / ml / day figure not present in the evidence, adds an unsupported claim (whitening, cures, "clinically proven", "hypoallergenic"…), or claims a completed order, refund or payment.
8. **Fallback:** [`src/lib/chat/fallbacks.ts`](src/lib/chat/fallbacks.ts) holds deterministic, admin-editable templates rendered from the live product record, with built-in defaults if the store is unreachable. Generative output is never used as a fallback.

Failure handling covered by tests: missing key, 401/403, 404 or unknown model, 429, 5xx, network loss, timeout, empty or malformed completions, embedding failure, vector store failure, empty or low-confidence retrieval, database outage, malformed or oversized input, and rate-limit abuse. Retries are bounded (`NVIDIA_MAX_RETRIES`). Browsers only ever receive `{ answer, mode, unverified, sources }`.

**Re-indexing** replaces the whole index in one transaction (`replace_knowledge_index`), so old and new versions of a document never coexist. It runs after every admin save when embeddings are configured, from Admin → Knowledge, via `npm run rag:reindex`, or lazily when the stored fingerprint differs from the live content (with a cool-down after failures).

## Payments (Razorpay)

The integration follows Razorpay's documented Standard Checkout flow, checked against razorpay.com on 2026-10-25:

1. `POST /api/checkout/order` reprices the bag server-side, validates the address and PIN-code serviceability, creates a `pending_payment` order (`create_order` checks the totals in SQL), then creates a Razorpay order (`POST /v1/orders`, Basic auth, amount in paise). It sets an httpOnly per-order access cookie.
2. The browser opens `checkout.js` with that `order_id`.
3. `POST /api/checkout/verify` checks `HMAC_SHA256(stored_order_id + "|" + payment_id, key_secret)` in constant time, then marks the order paid.
4. `POST /api/webhooks/razorpay` verifies `X-Razorpay-Signature` over the **raw** body, de-duplicates by `X-Razorpay-Event-Id`, and marks the order paid on `payment.captured` / `order.paid` if the amount matches.
5. `/order/[id]` shows details only to the browser holding that order's token, and shows "confirmed" only when the stored status is `paid`.

To enable: configure the keys and webhook (URL `https://<domain>/api/webhooks/razorpay`, events `payment.captured` and `order.paid`), set Supabase, set `CHECKOUT_LIVE_PAYMENTS=true`, configure the shipping fee and serviceable PIN codes and switch on checkout in Admin → Store settings, and approve all four policies. **Test end to end with `rzp_test_` keys before switching to live keys.** No payment call has been exercised against Razorpay in this environment. Signature logic is covered by unit tests, and the endpoints refuse with 503 when unconfigured.

Card data never touches this server: Razorpay Checkout collects it.

## Admin access

`/admin` covers the launch-readiness dashboard, products (create and edit: name, slug, price, copy, images and alt text, ingredient, category and skin-type mappings, benefits, SEO, status, availability, owner sign-off), categories and labels, skin types, ingredients, FAQs, knowledge documents, fallback copy, policies, brand and contact details, and checkout rules, plus an integration-status panel.

- **Production:** Supabase Auth email/password. The user must be in `ADMIN_EMAILS` or `admin_users`. The session is validated with `auth.getUser()` on every request.
- **Development:** `ADMIN_LOCAL_PASSWORD`, with an HMAC-signed, httpOnly, SameSite=strict, 8-hour session cookie. Automatically disabled when `APP_ENV`/`NODE_ENV` is production.
- **Authorisation is server-side:** the protected layout gate, every Server Action (via `saveContent`), and `/api/admin/reindex` all check the session. Hiding UI is not relied on. Login attempts are rate-limited.
- **Claim gate:** saves containing flagged wording (whitening, cures, guarantees, certifications, "free-from", origin, percentages…) require an explicit confirmation checkbox.
- **Honest results:** a save reports "re-indexed" only if re-indexing succeeded. Otherwise it says the storefront was updated and re-indexing failed.

## Deployment

The app targets any host that supports Next.js 16 with Node.js. Vercel is the simplest:

1. Push the repository and import it in Vercel.
2. Add the environment variables, with `APP_ENV=production` and `NEXT_PUBLIC_SITE_URL=https://<your-domain>`. Rebuild after changing environment variables, because static pages are generated at build time.
3. Set up Supabase as above. Without Supabase, production serves the bundled seed and the admin is read-only.
4. Configure the Razorpay webhook URL.
5. After deploying, run Admin → **Verify NVIDIA models** and **Re-index knowledge**, then work through the dashboard checklist.

Self-hosting: `npm run build && npm start` behind HTTPS. On serverless or multi-instance hosting, the in-memory rate limiter and in-memory vector store are per instance. Use Supabase/pgvector for the index, and consider a shared rate-limit store such as Redis.

## Security and privacy

- Secrets are server-only. There are no secret `NEXT_PUBLIC_*` variables, and logs redact key-like strings.
- Security headers: CSP (scripts from self and `checkout.razorpay.com`), `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, HSTS in production, and `noindex` on `/admin`. The CSP needs `'unsafe-inline'` for Next's inline bootstrap scripts. A nonce-based CSP would force every page to render dynamically.
- All API inputs are validated with Zod. Bodies are size-limited, POSTs are same-origin-checked, and the chat, contact, order and login endpoints are rate-limited.
- Prices are always recomputed on the server. Client-supplied prices are ignored. Integer paise are used throughout, and SQL constraints check line totals.
- Order access uses random 256-bit tokens, stored hashed in the database.
- Customer errors never include stack traces or internal messages.
- Data handled: the bag lives in the visitor's browser. Chat messages go to the server and, when enabled, to NVIDIA. Checkout details are stored in Supabase only when live payments are enabled. Retention periods and the privacy policy still need owner and legal input. **A privacy-policy page is not legal compliance.** Have the policies, data retention and DPDP Act obligations reviewed before launch.

## Testing

**Unit and integration tests** (`npm test`, 86 tests across 6 files) cover money formatting, seed integrity and normalisations, claim detection, filters, cart rules, server pricing, checkout readiness, Indian address validation, the admin save pipeline (authorisation, claim gate, read-only store, honest re-index reporting), signed sessions, Razorpay signatures, the launch checklist, log redaction, the NVIDIA client (requests, retries, error classification), and API route behaviour.

The chatbot suite maps one-to-one to the 12 required scenarios: grounded ingredient answer, configured price, no invented specs, empty-retrieval fallback, missing key, 401/403/404/429/5xx/timeout/network/malformed output, embedding failure, database failure, prompt injection and secret leakage, update → re-index propagation with stale-vector rejection, unapproved/inactive documents, and input validation.

**Browser tests** (`npm run test:e2e`, 13 tests) cover header and footer links, contact and Instagram links, combined filters and search with URL state, home → product → bag → checkout (quantity validation, persistence after refresh, totals, payment disabled, address validation, mailto order request), order privacy, chatbot fallbacks and injection refusal, no horizontal overflow at 360/390/768/1024/1440 px on eight pages, the mobile menu, structured data, sitemap and robots, admin access control, and admin price edits flowing to the storefront and chatbot plus the claim gate.

### Manual NVIDIA smoke test

1. Add `NVIDIA_API_KEY`, `NVIDIA_CHAT_MODEL` and `NVIDIA_EMBEDDING_MODEL` to `.env.local`.
2. Run `npm run nvidia:smoke`. Expect ✓ for the catalogue and both models, a chunk count with embedding dimensions, `mode ai` for the ingredient and price questions, and fallback or "not confirmed" for the percentage and injection probes.
3. Run `npm run dev`, open the assistant, ask "What are the ingredient highlights?" and "What's the SPF?". The second should say the detail isn't confirmed.
4. In Admin, change the price, save (the message should say "re-indexed"), and ask the price again.

## Content normalisations and claim policy

Normalisations applied to the owner brief (each needs owner confirmation and appears in the admin checklist where relevant):

- "Nilacinamide" → **Niacinamide** (original spelling kept in `suppliedName`)
- "kp2569481@ gmail.com" → **kp2569481@gmail.com**
- Instagram URL stripped of tracking parameters → `https://www.instagram.com/amros_beauty/`
- Category display labels are interpretations, marked `labelApproved: false`: Skin whitening → *Skin Brightening* (avoids whitening claims), Skin pigmentation → *Uneven Tone & Pigmentation*, Wrinkle pore → *Fine Lines & Pores*, **Dark head → *Blackheads & Dark Spots*** (an interpretation), Tan skin → *Tan & Dullness*
- The product is mapped only to **Cream**. Concern categories show an empty state until mappings are confirmed.

Seeded copy uses general ingredient-role language only. The product page and chatbot never state a full INCI list, concentrations, directions for use, pack size, stock, certifications, clinical results, country of manufacture, "free-from" claims, or whitening, cure or guarantee claims. Product copy is marked **awaiting owner sign-off** (`claimsApproved: false`).

**Imagery:** all product and ingredient visuals are original vector illustrations generated by [scripts/generate-assets.mjs](scripts/generate-assets.mjs) (no image-generation tool was available). Packaging renders are labelled as **concept visualisations**. The homepage hero overlays the product name as live HTML text. To use real photography, upload it and set the image path and kind "photo" in Admin → Products.

## Known limitations

- **Not verified against live services:** NVIDIA inference and embeddings, Supabase (migration, RLS, RPCs), Razorpay payments and webhooks, and Resend email have not been run against real accounts here. The interfaces follow current documentation and fall back safely, but each needs the smoke checks above once credentials exist.
- Rate limiting and the in-memory vector index are per process.
- The Supabase vector column is dimension-agnostic and uses exact search, which is fine for this small knowledge base. Add a fixed-dimension HNSW index if it grows a lot.
- The admin product form has two blank rows for new images and benefits per save (save again to add more). Image upload to storage isn't built: images are referenced by path or URL.
- No order-management screen, refund flow, order emails or order tracking. Orders are visible in Supabase.
- No customer accounts, reviews, discounts or GST invoicing. These are business decisions for later.
- Dark mode isn't offered. The palette is designed for a light, milky aesthetic.

## Launch checklist

Live status is in **Admin → Dashboard**. Before taking real orders:

**Product facts (owner)**
- [ ] Full ingredient declaration (INCI) from final packaging
- [ ] Verified directions for use
- [ ] Pack size, and stock and availability process
- [ ] Final packaging photography (replaces concept renders)
- [ ] Sign-off of product description and benefit statements (`claimsApproved`)
- [ ] Confirm the Dry and Sensitive Skin positioning is supported by the formula
- [ ] Confirm the Niacinamide spelling and any additional category mappings

**Labels and claims**
- [ ] Approve or edit all category display labels, especially "Blackheads & Dark Spots" (from "Dark head") and "Skin Brightening" (from "Skin whitening")
- [ ] Confirm there are no whitening, medical or clinical claims in any external marketing

**Policies and legal (owner, ideally with legal review)**
- [ ] Shipping & Delivery, Returns & Refunds, Privacy Policy, Terms & Conditions text
- [ ] Business and legal entity details, GST registration and invoicing approach
- [ ] Data retention and privacy obligations (e.g. India's DPDP Act)

**Commerce configuration**
- [ ] Shipping fee and any free-shipping threshold
- [ ] Serviceable PIN codes (or "ALL")
- [ ] Whether prices include GST
- [ ] Approved delivery estimate
- [ ] Maximum quantity per item (default 10)

**Integrations**
- [ ] Supabase project, migration applied, seeded, admin users created
- [ ] NVIDIA key, model IDs verified with `npm run nvidia:smoke`, index built
- [ ] Razorpay test-mode run end to end (order → payment → verify → webhook), then live keys, `CHECKOUT_LIVE_PAYMENTS=true`, and checkout switched on in admin
- [ ] Optional: Resend for the contact form
- [ ] `NEXT_PUBLIC_SITE_URL` and `APP_ENV=production` set; domain on HTTPS
