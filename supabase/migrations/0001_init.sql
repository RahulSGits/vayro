-- ============================================================================
-- VAYRO — initial schema
-- Postgres / Supabase. Row Level Security is enabled on every table; admin
-- access is granted by the `user_role` on public.profiles, never by the client.
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create type user_role     as enum ('customer', 'admin');
create type product_status as enum ('draft', 'published', 'archived');
create type order_status   as enum ('pending','paid','processing','shipped','delivered','cancelled','refunded');
create type image_kind     as enum ('editorial','technical','detail','flat');
create type model_mode     as enum ('default','transformation','exploded');

-- ---------------------------------------------------------------- profiles --
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  full_name    text,
  phone        text,
  role         user_role not null default 'customer',
  marketing_opt_in boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ------------------------------------------------------ catalogue: taxonomy --
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  position int not null default 0
);

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  description text,
  hero_image text,
  position int not null default 0
);

-- ------------------------------------------------------- catalogue: product --
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  story text not null default '',
  description text not null default '',
  status product_status not null default 'draft',
  price bigint not null check (price >= 0),          -- minor units
  compare_at_price bigint check (compare_at_price >= 0),
  currency text not null default 'INR',
  category_id uuid references public.categories(id) on delete set null,
  badges text[] not null default '{}',
  specs jsonb not null default '[]',
  hotspots jsonb not null default '[]',
  features jsonb not null default '[]',
  care text[] not null default '{}',
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_status_idx  on public.products (status);
create index products_featured_idx on public.products (featured) where status = 'published';
create index products_search_idx  on public.products using gin (
  (name || ' ' || coalesce(subtitle,'') || ' ' || description) gin_trgm_ops);

create table public.product_collections (
  product_id uuid references public.products(id) on delete cascade,
  collection_id uuid references public.collections(id) on delete cascade,
  primary key (product_id, collection_id)
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  colorway text not null,
  color_hex text not null,
  size text not null,
  price_override bigint check (price_override >= 0),
  weight_grams int,
  created_at timestamptz not null default now(),
  unique (product_id, colorway, size)
);
create index product_variants_product_idx on public.product_variants (product_id);

create table public.inventory (
  variant_id uuid primary key references public.product_variants(id) on delete cascade,
  stock int not null default 0 check (stock >= 0),
  low_stock_threshold int not null default 4,
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt text not null default '',
  kind image_kind not null default 'technical',
  colorway text,
  position int not null default 0
);
create index product_images_product_idx on public.product_images (product_id, position);

create table public.product_3d_models (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  format text not null default 'glb',
  mode model_mode not null default 'default',
  placeholder boolean not null default true,
  size_bytes bigint
);

-- ------------------------------------------------------------------ commerce --
create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text not null,
  postal_code text not null,
  country text not null default 'IN',
  phone text,
  is_default_shipping boolean not null default false,
  is_default_billing  boolean not null default false,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

create table public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  session_id text,
  updated_at timestamptz not null default now(),
  check (user_id is not null or session_id is not null)
);

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity > 0),
  unique (cart_id, variant_id)
);

create sequence if not exists order_number_seq start 1041;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default 'VY-' || lpad(nextval('order_number_seq')::text, 5, '0'),
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  status order_status not null default 'pending',
  currency text not null default 'INR',
  subtotal bigint not null default 0,
  shipping bigint not null default 0,
  tax bigint not null default 0,
  discount bigint not null default 0,
  total bigint not null default 0,
  shipping_address jsonb,
  billing_address jsonb,
  tracking_number text,
  carrier text,
  notes text,
  stripe_payment_intent text,
  placed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_user_idx   on public.orders (user_id, placed_at desc);
create index orders_status_idx on public.orders (status, placed_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  name text not null, colorway text not null, size text not null, sku text not null,
  unit_price bigint not null, quantity int not null check (quantity > 0), image text
);
create index order_items_order_idx on public.order_items (order_id);

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.wishlist_items (
  wishlist_id uuid references public.wishlists(id) on delete cascade,
  product_id  uuid references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wishlist_id, product_id)
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  rating int not null check (rating between 1 and 5),
  title text,
  body text not null,
  verified_purchase boolean not null default false,
  is_demo boolean not null default false,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, created_at desc);

-- ------------------------------------------------------------------ content --
create table public.journal_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  body text not null default '',
  category text not null default 'Field Notes',
  hero_image text,
  reading_minutes int not null default 3,
  author text not null default 'VAYRO Studio',
  published_at timestamptz
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  consent boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.analytics_events (
  id bigserial primary key,
  name text not null,
  props jsonb not null default '{}',
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  created_at timestamptz not null default now()
);
create index analytics_events_name_idx on public.analytics_events (name, created_at desc);

-- --------------------------------------------------------------------- RLS --
alter table public.profiles              enable row level security;
alter table public.categories            enable row level security;
alter table public.collections           enable row level security;
alter table public.products              enable row level security;
alter table public.product_collections   enable row level security;
alter table public.product_variants      enable row level security;
alter table public.inventory             enable row level security;
alter table public.product_images        enable row level security;
alter table public.product_3d_models     enable row level security;
alter table public.addresses             enable row level security;
alter table public.carts                 enable row level security;
alter table public.cart_items            enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.wishlists             enable row level security;
alter table public.wishlist_items        enable row level security;
alter table public.reviews               enable row level security;
alter table public.journal_posts         enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.settings              enable row level security;
alter table public.analytics_events      enable row level security;

-- public read of published catalogue
create policy "catalogue readable" on public.categories        for select using (true);
create policy "collections readable" on public.collections     for select using (true);
create policy "published products readable" on public.products for select
  using (status = 'published' or public.is_admin());
create policy "product joins readable" on public.product_collections for select using (true);
create policy "variants readable" on public.product_variants   for select using (true);
create policy "inventory readable" on public.inventory         for select using (true);
create policy "images readable" on public.product_images       for select using (true);
create policy "models readable" on public.product_3d_models    for select using (true);
create policy "published posts readable" on public.journal_posts for select
  using (published_at is not null or public.is_admin());
create policy "approved reviews readable" on public.reviews    for select
  using (approved or is_demo or public.is_admin());

-- admin writes across the catalogue
create policy "admin writes categories"  on public.categories        for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes collections" on public.collections       for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes products"    on public.products          for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes pc"          on public.product_collections for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes variants"    on public.product_variants  for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes inventory"   on public.inventory         for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes images"      on public.product_images    for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes models"      on public.product_3d_models for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes posts"       on public.journal_posts     for all using (public.is_admin()) with check (public.is_admin());
create policy "admin writes settings"    on public.settings          for all using (public.is_admin()) with check (public.is_admin());
create policy "settings readable"        on public.settings          for select using (true);

-- profiles: self read/write, admin read-all
create policy "own profile readable" on public.profiles for select
  using (id = auth.uid() or public.is_admin());
create policy "own profile writable" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
create policy "admin manages profiles" on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- addresses, carts, wishlists: owner-scoped
create policy "own addresses" on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own carts" on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own cart items" on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));
create policy "own wishlist" on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own wishlist items" on public.wishlist_items for all
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- orders: owner read, admin all. Writes go through the service role only.
create policy "own orders readable" on public.orders for select
  using (user_id = auth.uid() or public.is_admin());
create policy "admin manages orders" on public.orders for all
  using (public.is_admin()) with check (public.is_admin());
create policy "own order items readable" on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy "admin manages order items" on public.order_items for all
  using (public.is_admin()) with check (public.is_admin());

-- reviews: authenticated users may submit; approval is an admin action
create policy "submit own review" on public.reviews for insert
  to authenticated with check (user_id = auth.uid());
create policy "admin manages reviews" on public.reviews for all
  using (public.is_admin()) with check (public.is_admin());

-- newsletter: anonymous insert only, never readable from the client
create policy "newsletter signup" on public.newsletter_subscribers for insert
  to anon, authenticated with check (consent = true);
create policy "admin reads newsletter" on public.newsletter_subscribers for select
  using (public.is_admin());

-- analytics: write-only from clients
create policy "analytics insert" on public.analytics_events for insert
  to anon, authenticated with check (true);
create policy "admin reads analytics" on public.analytics_events for select
  using (public.is_admin());

-- ------------------------------------------------- denormalised read model --
create or replace function public.products_full()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(p order by p->>'createdAt' desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', pr.id, 'slug', pr.slug, 'name', pr.name, 'subtitle', pr.subtitle,
      'story', pr.story, 'description', pr.description, 'status', pr.status,
      'price', pr.price, 'compareAtPrice', pr.compare_at_price, 'currency', pr.currency,
      'categorySlug', coalesce(c.slug, ''), 'badges', to_jsonb(pr.badges),
      'specs', pr.specs, 'hotspots', pr.hotspots, 'features', pr.features,
      'care', to_jsonb(pr.care), 'featured', pr.featured,
      'createdAt', pr.created_at,
      'collectionSlugs', coalesce((select jsonb_agg(co.slug) from public.product_collections pc
        join public.collections co on co.id = pc.collection_id where pc.product_id = pr.id), '[]'::jsonb),
      'images', coalesce((select jsonb_agg(jsonb_build_object(
          'id', i.id, 'url', i.url, 'alt', i.alt, 'position', i.position,
          'kind', i.kind, 'colorway', i.colorway) order by i.position)
        from public.product_images i where i.product_id = pr.id), '[]'::jsonb),
      'models', coalesce((select jsonb_agg(jsonb_build_object(
          'id', m.id, 'url', m.url, 'format', m.format, 'mode', m.mode,
          'placeholder', m.placeholder, 'sizeBytes', m.size_bytes))
        from public.product_3d_models m where m.product_id = pr.id), '[]'::jsonb),
      'variants', coalesce((select jsonb_agg(jsonb_build_object(
          'id', v.id, 'sku', v.sku, 'productId', v.product_id, 'colorway', v.colorway,
          'colorHex', v.color_hex, 'size', v.size, 'priceOverride', v.price_override,
          'stock', coalesce(inv.stock, 0), 'available', coalesce(inv.stock, 0) > 0,
          'weightGrams', v.weight_grams))
        from public.product_variants v
        left join public.inventory inv on inv.variant_id = v.id
        where v.product_id = pr.id), '[]'::jsonb)
    ) as p
    from public.products pr
    left join public.categories c on c.id = pr.category_id
    where pr.status = 'published'
  ) t;
$$;

grant execute on function public.products_full() to anon, authenticated;

-- ------------------------------------------------------- admin dashboard ----
create or replace view public.admin_metrics as
  select
    (select coalesce(sum(total),0) from public.orders where status in ('paid','processing','shipped','delivered')) as revenue,
    (select count(*) from public.orders)                                as order_count,
    (select count(*) from public.profiles where role = 'customer')      as customer_count,
    (select coalesce(avg(total),0)::bigint from public.orders where status <> 'cancelled') as average_order_value,
    (select count(*) from public.inventory where stock <= low_stock_threshold) as low_stock_count;
