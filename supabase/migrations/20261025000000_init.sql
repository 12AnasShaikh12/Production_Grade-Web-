-- Amros Beauty — initial schema
-- Apply with the Supabase CLI (`supabase db push`) or paste into the SQL editor.
-- All tables have RLS enabled. The storefront server uses the service-role key (server-only);
-- anonymous clients may only read published catalogue data.

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------------------------
-- Content
-- ---------------------------------------------------------------------------------------------

create table if not exists public.site_settings (
  key text primary key check (key in ('brand', 'fallbacks', 'commerce')),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  label text not null,
  owner_label text not null,
  description text not null,
  sort_order int not null default 0,
  label_approved boolean not null default false,
  is_all boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.skin_types (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  label text not null,
  description text not null,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.ingredients (
  id text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  supplied_name text,
  role text not null,
  general_info text not null,
  verified_product_note text,
  image text not null,
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  name text not null,
  short_name text not null,
  tagline text not null,
  short_description text not null,
  description text not null,
  price_paise integer not null check (price_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  size_label text,
  images jsonb not null default '[]'::jsonb,
  ingredient_ids text[] not null default '{}',
  full_ingredient_declaration text,
  benefits jsonb not null default '[]'::jsonb,
  category_ids text[] not null default '{}',
  skin_type_ids text[] not null default '{}',
  usage_instructions text,
  safety_notes text not null,
  status text not null default 'draft' check (status in ('active', 'draft', 'archived')),
  availability text not null default 'unconfirmed' check (availability in ('in_stock', 'out_of_stock', 'unconfirmed')),
  seo_title text not null,
  seo_description text not null,
  claims_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faqs (
  id text primary key,
  question text not null,
  answer text not null,
  category text not null check (category in ('product', 'ingredients', 'skin', 'orders', 'support')),
  sort_order int not null default 0,
  approved boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.policies (
  slug text primary key check (slug in ('shipping', 'returns', 'privacy', 'terms')),
  title text not null,
  summary text not null,
  body text,
  status text not null default 'missing' check (status in ('missing', 'draft', 'approved')),
  updated_at timestamptz not null default now()
);

create table if not exists public.knowledge_documents (
  id text primary key,
  doc_type text not null,
  title text not null,
  content text not null,
  approved boolean not null default false,
  active boolean not null default true,
  source text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- RAG vector index
-- Embedding dimensionality depends on the configured NVIDIA model, so the column is
-- unconstrained and every query filters by embedding_model. The knowledge base is small, so
-- exact (sequential) cosine search is used; add an HNSW index on a fixed-dimension column if it grows.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.knowledge_chunks (
  id text primary key,
  document_id text not null,
  document_version text not null,
  doc_type text not null,
  title text not null,
  chunk_index int not null,
  content text not null,
  embedding extensions.vector not null,
  embedding_model text not null,
  created_at timestamptz not null default now()
);
create index if not exists knowledge_chunks_model_idx on public.knowledge_chunks (embedding_model);

create table if not exists public.knowledge_index_state (
  id int primary key default 1 check (id = 1),
  embedding_model text,
  fingerprint text,
  chunk_count int not null default 0,
  indexed_at timestamptz
);

create or replace function public.match_knowledge_chunks(query_embedding text, p_model text, match_count int)
returns table (id text, document_id text, document_version text, title text, content text, similarity double precision)
language sql stable
set search_path = public, extensions
as $$
  select c.id, c.document_id, c.document_version, c.title, c.content,
         1 - (c.embedding <=> query_embedding::extensions.vector) as similarity
  from public.knowledge_chunks c
  where c.embedding_model = p_model
    and vector_dims(c.embedding) = vector_dims(query_embedding::extensions.vector)
  order by c.embedding <=> query_embedding::extensions.vector
  limit least(greatest(match_count, 1), 50);
$$;

-- Replaces the whole index in one transaction so stale and current versions never coexist.
create or replace function public.replace_knowledge_index(p_model text, p_fingerprint text, p_chunks jsonb)
returns int
language plpgsql
set search_path = public, extensions
as $$
declare
  inserted int;
begin
  delete from public.knowledge_chunks;
  insert into public.knowledge_chunks (id, document_id, document_version, doc_type, title, chunk_index, content, embedding, embedding_model)
  select c->>'id', c->>'document_id', c->>'document_version', c->>'doc_type', c->>'title', (c->>'chunk_index')::int, c->>'content',
         (c->>'embedding')::extensions.vector, p_model
  from jsonb_array_elements(p_chunks) as c;
  get diagnostics inserted = row_count;
  insert into public.knowledge_index_state (id, embedding_model, fingerprint, chunk_count, indexed_at)
  values (1, p_model, p_fingerprint, inserted, now())
  on conflict (id) do update set embedding_model = excluded.embedding_model, fingerprint = excluded.fingerprint,
    chunk_count = excluded.chunk_count, indexed_at = excluded.indexed_at;
  return inserted;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Orders & payments
-- ---------------------------------------------------------------------------------------------

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'failed', 'cancelled')),
  access_token_hash text not null,
  customer jsonb not null,
  shipping_address jsonb not null,
  subtotal_paise integer not null check (subtotal_paise >= 0),
  shipping_paise integer not null check (shipping_paise >= 0),
  total_paise integer not null check (total_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_name text not null,
  unit_price_paise integer not null check (unit_price_paise > 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total_paise integer not null check (line_total_paise = unit_price_paise * quantity)
);
create index if not exists order_items_order_idx on public.order_items (order_id);

create table if not exists public.payment_events (
  id text primary key,
  event text not null,
  received_at timestamptz not null default now()
);

create or replace function public.create_order(p_order jsonb, p_items jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_id uuid;
  items_total int;
begin
  select coalesce(sum((i->>'line_total_paise')::int), 0) into items_total from jsonb_array_elements(p_items) as i;
  if items_total <> (p_order->>'subtotal_paise')::int then
    raise exception 'Order subtotal does not match line items';
  end if;
  if (p_order->>'subtotal_paise')::int + (p_order->>'shipping_paise')::int <> (p_order->>'total_paise')::int then
    raise exception 'Order total does not match subtotal + shipping';
  end if;
  insert into public.orders (access_token_hash, customer, shipping_address, subtotal_paise, shipping_paise, total_paise, currency)
  values (p_order->>'access_token_hash', p_order->'customer', p_order->'shipping_address', (p_order->>'subtotal_paise')::int,
          (p_order->>'shipping_paise')::int, (p_order->>'total_paise')::int, 'INR')
  returning id into new_id;
  insert into public.order_items (order_id, product_id, product_name, unit_price_paise, quantity, line_total_paise)
  select new_id, i->>'product_id', i->>'product_name', (i->>'unit_price_paise')::int, (i->>'quantity')::int, (i->>'line_total_paise')::int
  from jsonb_array_elements(p_items) as i;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Admin roles
-- ---------------------------------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'editor' check (role in ('admin', 'editor')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['site_settings','categories','skin_types','ingredients','products','faqs','policies','knowledge_documents','orders'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------------------------

alter table public.site_settings enable row level security;
alter table public.categories enable row level security;
alter table public.skin_types enable row level security;
alter table public.ingredients enable row level security;
alter table public.products enable row level security;
alter table public.faqs enable row level security;
alter table public.policies enable row level security;
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_index_state enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_events enable row level security;
alter table public.admin_users enable row level security;

-- Public (anon) read access is limited to published catalogue content. No public write policies exist.
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);
drop policy if exists "public read skin types" on public.skin_types;
create policy "public read skin types" on public.skin_types for select using (true);
drop policy if exists "public read approved ingredients" on public.ingredients;
create policy "public read approved ingredients" on public.ingredients for select using (approved);
drop policy if exists "public read active products" on public.products;
create policy "public read active products" on public.products for select using (status = 'active');
drop policy if exists "public read approved faqs" on public.faqs;
create policy "public read approved faqs" on public.faqs for select using (approved);
drop policy if exists "public read approved policies" on public.policies;
create policy "public read approved policies" on public.policies for select using (status = 'approved');

-- Orders, payments, knowledge, settings and admin tables: service role only (no policies = no access).

revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.replace_knowledge_index(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.match_knowledge_chunks(text, text, int) from public, anon, authenticated;
