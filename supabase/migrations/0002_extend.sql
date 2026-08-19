-- ============================================================================
-- VAYRO — 0002_extend
--
-- Strictly additive. 0001_init is immutable: it is the migration every
-- existing database has already applied, so nothing here alters, drops or
-- redefines anything it created except by `add column if not exists`.
-- Every statement is idempotent, so a partially-applied run can be repeated.
--
-- What this adds
--   1. product_materials  — per-product PBR regions for the 3D/AR layer
--   2. AR fields on product_3d_models — ar_enabled, usdz_url, real dimensions
--   3. coupons + coupon_redemptions — real discounts, replacing the hardcoded
--      demo table mirrored in src/store/cart.ts and src/app/api/_lib/pricing.ts
--   4. orders.payment_provider / payment_reference — so a second payment rail
--      (Razorpay) can key its webhooks on something that is not named `stripe`
--
-- RLS conventions are inherited from 0001: published catalogue data is world
-- readable, everything else is owner-scoped or admin-only, and writes that
-- move money go through the service role. Where this file departs from
-- "public read" it says why at the policy.
-- ============================================================================

-- ------------------------------------------------------------------ types --
-- `create type` has no IF NOT EXISTS; the guard makes a re-run a no-op.
do $$ begin
  create type coupon_type as enum ('percent', 'fixed');
exception when duplicate_object then null;
end $$;

-- ======================================================== product_materials =
-- One row per shaded region of a product: the shell, the lining, the zip
-- tape, the hardware. `JacketModel` builds procedural geometry today and
-- probes a GLB when one exists; either way the *material* is a property of the
-- product, not of the mesh, so it lives here rather than in the model file.
--
-- `colorway` mirrors the nullable-text convention of public.product_images:
-- null means the region looks the same in every colourway, a value pins it to
-- one. It is deliberately not a foreign key — variants are (colorway, size)
-- pairs, and a material region belongs to the colourway across every size.
create table if not exists public.product_materials (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products(id) on delete cascade,

  -- Human name of the region, e.g. 'Shell'. `slug` is the stable key the
  -- renderer targets, so the display name can be reworded without breaking it.
  name          text not null check (length(btrim(name)) between 1 and 60),
  slug          text check (slug is null or slug ~ '^[a-z0-9-]+$'),
  colorway      text,

  -- PBR inputs. Ranges are clamped in the database because a roughness of 4
  -- is not a rendering bug to be discovered in the browser.
  base_color    text not null default '#8C9195' check (base_color ~ '^#[0-9A-Fa-f]{6}$'),
  roughness     numeric(4,3) not null default 0.600 check (roughness between 0 and 1),
  metalness     numeric(4,3) not null default 0.000 check (metalness between 0 and 1),

  normal_map    text,
  normal_scale  numeric(5,3) not null default 1.000 check (normal_scale between 0 and 10),
  ao_map        text,
  ao_intensity  numeric(4,3) not null default 1.000 check (ao_intensity between 0 and 1),

  -- Optional extras the shader may or may not consume. Absent means "use the
  -- material default", which is not the same as zero.
  roughness_map text,
  opacity       numeric(4,3) not null default 1.000 check (opacity between 0 and 1),
  sheen         numeric(4,3) not null default 0.000 check (sheen between 0 and 1),
  double_sided  boolean not null default false,

  position      int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists product_materials_product_idx
  on public.product_materials (product_id, position);
create index if not exists product_materials_colorway_idx
  on public.product_materials (product_id, colorway)
  where colorway is not null;

-- One region per (product, name, colourway). A plain UNIQUE would let the
-- colourway-agnostic row be inserted repeatedly, because NULLs never collide;
-- coalescing to '' in the index closes that.
create unique index if not exists product_materials_region_idx
  on public.product_materials (product_id, name, coalesce(colorway, ''));

-- ============================================ AR fields on product_3d_models
-- Quick Look on iOS needs a USDZ next to the GLB, and placing a garment in a
-- room needs its real size — a jacket rendered at 30 cm is a toy.
alter table public.product_3d_models
  add column if not exists ar_enabled            boolean not null default false,
  add column if not exists usdz_url              text,
  add column if not exists real_world_dimensions jsonb;

-- { "unit": "cm", "width": 58, "height": 72, "depth": 12 } — an object or
-- nothing. An array or a bare number here would fail silently in the viewer.
do $$ begin
  alter table public.product_3d_models
    add constraint product_3d_models_dimensions_object
    check (real_world_dimensions is null or jsonb_typeof(real_world_dimensions) = 'object');
exception when duplicate_object then null;
end $$;

-- `usdz_url` is deliberately not required by `ar_enabled`. iOS Quick Look
-- needs the USDZ; Android's Scene Viewer and WebXR place the GLB in `url`
-- directly, so a model that is AR-ready on Android only is a real state and
-- the viewer decides per platform what it can offer.

-- 0001 created this table without an index on its foreign key; every read is
-- by product.
create index if not exists product_3d_models_product_idx
  on public.product_3d_models (product_id, mode);
create index if not exists product_3d_models_ar_idx
  on public.product_3d_models (product_id)
  where ar_enabled;

-- =================================================================== coupons
-- `value` carries two units, decided by `type`:
--   percent -> 1..100, applied to the merchandise subtotal
--   fixed   -> minor units in `currency`, subtracted from it
-- The percent/fixed split is enforced by constraint rather than convention so
-- a 5000%-off row cannot exist to be discovered at checkout.
create table if not exists public.coupons (
  id                 uuid primary key default gen_random_uuid(),
  code               text not null unique,
  description        text,
  type               coupon_type not null default 'percent',
  value              bigint not null check (value >= 0),
  -- Required for `fixed`, meaningless for `percent`: a fixed amount without a
  -- currency cannot be compared to a basket.
  currency           text,
  min_subtotal       bigint not null default 0 check (min_subtotal >= 0),
  starts_at          timestamptz,
  ends_at            timestamptz,
  -- null = unlimited. Both limits are advisory at the row level and enforced
  -- by whoever redeems; the trigger below keeps `used_count` honest.
  usage_limit        int check (usage_limit is null or usage_limit > 0),
  per_customer_limit int check (per_customer_limit is null or per_customer_limit > 0),
  used_count         int not null default 0 check (used_count >= 0),
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Codes are matched case-insensitively everywhere in the app by upper-casing
  -- the input, so they are stored upper-case and nothing has to remember to.
  constraint coupons_code_shape
    check (code = upper(code) and code ~ '^[A-Z0-9][A-Z0-9_-]{2,39}$'),
  constraint coupons_percent_range
    check (type <> 'percent' or value between 1 and 100),
  constraint coupons_fixed_needs_currency
    check (type <> 'fixed' or (currency is not null and value > 0)),
  constraint coupons_window
    check (starts_at is null or ends_at is null or ends_at > starts_at)
);

create index if not exists coupons_active_idx
  on public.coupons (code)
  where active;
create index if not exists coupons_window_idx
  on public.coupons (ends_at)
  where active;

-- ------------------------------------------------------ coupon_redemptions --
-- The audit trail. One row per order that actually used a code, carrying the
-- money it took off so a discount can be reconciled long after the coupon has
-- been edited or deleted.
create table if not exists public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons(id) on delete cascade,
  order_id    uuid references public.orders(id) on delete set null,
  user_id     uuid references public.profiles(id) on delete set null,
  -- Guest checkouts have no profile; the address on the order is the only
  -- identity there is, so the email is recorded for per-customer limits.
  email       text,
  amount_off  bigint not null default 0 check (amount_off >= 0),
  currency    text not null default 'INR',
  redeemed_at timestamptz not null default now()
);

create index if not exists coupon_redemptions_coupon_idx
  on public.coupon_redemptions (coupon_id, redeemed_at desc);
create index if not exists coupon_redemptions_user_idx
  on public.coupon_redemptions (user_id, redeemed_at desc)
  where user_id is not null;
create index if not exists coupon_redemptions_email_idx
  on public.coupon_redemptions (coupon_id, lower(email))
  where email is not null;

-- One redemption per coupon per order. A retried write after a network blip
-- must not bill the discount twice or inflate `used_count`.
create unique index if not exists coupon_redemptions_order_idx
  on public.coupon_redemptions (coupon_id, order_id)
  where order_id is not null;

-- `used_count` is a cache of this table. Maintaining it in a trigger means a
-- redemption written by any path — service role, admin, backfill — can never
-- leave the counter behind.
create or replace function public.sync_coupon_usage()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.coupons
       set used_count = used_count + 1, updated_at = now()
     where id = new.coupon_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.coupons
       set used_count = greatest(0, used_count - 1), updated_at = now()
     where id = old.coupon_id;
    return old;
  end if;
  return null;
end $$;

drop trigger if exists coupon_redemption_counts on public.coupon_redemptions;
create trigger coupon_redemption_counts
  after insert or delete on public.coupon_redemptions
  for each row execute function public.sync_coupon_usage();

-- ------------------------------------------------------------ code lookup --
-- Coupons are NOT world-readable: a public select on this table hands every
-- unlisted code to anyone who opens devtools. Instead a security-definer
-- function answers one question — "is this exact code redeemable right now,
-- and for how much" — and returns nothing at all for a code that is not.
create or replace function public.coupon_lookup(p_code text, p_subtotal bigint default 0)
returns table (
  code         text,
  type         coupon_type,
  value        bigint,
  currency     text,
  min_subtotal bigint,
  description  text
)
language sql stable security definer set search_path = public as $$
  select c.code, c.type, c.value, c.currency, c.min_subtotal, c.description
    from public.coupons c
   where c.code = upper(btrim(p_code))
     and c.active
     and (c.starts_at is null or c.starts_at <= now())
     and (c.ends_at   is null or c.ends_at   >  now())
     and (c.usage_limit is null or c.used_count < c.usage_limit)
     and coalesce(p_subtotal, 0) >= c.min_subtotal
   limit 1;
$$;

grant execute on function public.coupon_lookup(text, bigint) to anon, authenticated;

-- ================================================ orders: second payment rail
-- 0001 named the reference column `stripe_payment_intent`. Rather than rename
-- it — which would break every reader in the app and in 0001's own policies —
-- a provider-neutral pair is added alongside and backfilled. Existing rows
-- keep working; new rails write here.
alter table public.orders
  add column if not exists payment_provider  text not null default 'stripe',
  add column if not exists payment_reference text;

do $$ begin
  alter table public.orders
    add constraint orders_payment_provider_known
    check (payment_provider in ('stripe', 'razorpay', 'demo', 'manual'));
exception when duplicate_object then null;
end $$;

update public.orders
   set payment_reference = stripe_payment_intent
 where payment_reference is null
   and stripe_payment_intent is not null;

create index if not exists orders_payment_reference_idx
  on public.orders (payment_reference)
  where payment_reference is not null;
-- The Stripe webhook keys on this column and 0001 left it unindexed.
create index if not exists orders_payment_intent_idx
  on public.orders (stripe_payment_intent)
  where stripe_payment_intent is not null;

-- ===================================================================== RLS ==
alter table public.product_materials   enable row level security;
alter table public.coupons             enable row level security;
alter table public.coupon_redemptions  enable row level security;

-- ------------------------------------------------------- product_materials --
-- Catalogue data. Readable exactly as far as the product it describes is:
-- a draft product's materials are an unreleased colourway, not public record.
drop policy if exists "published product materials readable" on public.product_materials;
create policy "published product materials readable" on public.product_materials for select
  using (
    exists (
      -- Qualified on both sides: `products` has no `product_id`, so an
      -- unqualified reference would silently resolve outward and keep working
      -- until the day someone adds one.
      select 1 from public.products p
       where p.id = public.product_materials.product_id
         and (p.status = 'published' or public.is_admin())
    )
  );

drop policy if exists "admin writes product materials" on public.product_materials;
create policy "admin writes product materials" on public.product_materials for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ coupons --
-- Admin-only, both ways. Customers reach a coupon through
-- `public.coupon_lookup()`, which is security definer and answers only for an
-- exact code. There is no select policy for anon or authenticated on purpose:
-- a discount table is a price list, and enumerating it is the attack.
drop policy if exists "admin reads coupons" on public.coupons;
create policy "admin reads coupons" on public.coupons for select
  using (public.is_admin());

drop policy if exists "admin writes coupons" on public.coupons;
create policy "admin writes coupons" on public.coupons for all
  using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------- coupon_redemptions --
-- Owner reads their own history; admin reads everything. Writes are a
-- service-role act, exactly like the order rows they accompany — a client that
-- could insert here could mint itself an unlimited coupon.
drop policy if exists "own redemptions readable" on public.coupon_redemptions;
create policy "own redemptions readable" on public.coupon_redemptions for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin manages redemptions" on public.coupon_redemptions;
create policy "admin manages redemptions" on public.coupon_redemptions for all
  using (public.is_admin()) with check (public.is_admin());
