#!/usr/bin/env node
/* ==========================================================================
   VAYRO — Supabase seeding.

   Usage:  npm run seed

   Populates a project that has already had `supabase/migrations/0001_init.sql`
   applied, from the same catalogue the storefront renders in demo mode.
   Re-running is safe and expected: every write is an upsert on a natural key
   (slug, SKU, variant id, settings key), and the two child tables that have no
   natural key — images and 3D models — are replaced per product rather than
   appended to. Seed twice, get the same database.

   ── How the catalogue is read without a TypeScript toolchain ─────────────
   Directly. `src/data/catalog.ts` is imported through Node's built-in type
   stripping (stable and on by default from Node 22.18 / 23.6), which erases
   the annotations and runs the module as ordinary ESM. Its only import is
   `import type { … } from '@/types'`, which is type-only and therefore erased
   before the unresolvable `@/` alias is ever looked up.

   The alternative — mirroring the catalogue to JSON at build time — was
   rejected on the grounds that a generated copy is a second source of truth
   that goes stale silently. `src/app/admin/_data/settings.ts` is read the same
   way, so the seeded store settings are literally the admin screen's defaults.

   ── What it will not do ──────────────────────────────────────────────────
   Nothing is deleted that it did not write, no table is truncated, and no
   order, customer, review or newsletter subscriber is ever touched.
   ========================================================================== */

import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* --------------------------------------------------------------- output -- */

const log = {
  step: (message) => process.stdout.write(`\n▸ ${message}\n`),
  ok: (message) => console.log(`  ✓ ${message}`),
  info: (message) => console.log(`  · ${message}`),
  warn: (message) => console.warn(`  ! ${message}`),
};

/** Prints a bordered explanation and stops. Used for anything unrecoverable. */
function fail(title, lines = []) {
  console.error(`\n✗ ${title}\n`);
  for (const line of lines) console.error(`  ${line}`);
  console.error('');
  process.exit(1);
}

/* ------------------------------------------------------------ preflight -- */

function assertNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  const supported = major > 23 || (major === 23 && minor >= 6) || (major === 22 && minor >= 18);
  if (supported) return;

  fail(`Node ${process.versions.node} cannot read the TypeScript catalogue.`, [
    'This script imports src/data/catalog.ts directly, which needs Node\'s built-in',
    'type stripping — stable from Node 22.18 and 23.6.',
    '',
    'Upgrade Node, or on Node 22.6–22.17 run:',
    '  node --experimental-strip-types scripts/seed.mjs',
  ]);
}

function requireEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRole) {
    fail('SUPABASE_SERVICE_ROLE_KEY is not set.', [
      'Seeding writes across every catalogue table and creates auth users, which',
      'Row Level Security correctly refuses to the anon key.',
      '',
      'Copy it from Supabase → Project Settings → API → service_role, and put it in',
      '.env.local:',
      '',
      '  SUPABASE_SERVICE_ROLE_KEY=eyJ...',
      '',
      'It is a full-access credential. Never prefix it with NEXT_PUBLIC_, never commit',
      'it, and never ship it to the browser.',
    ]);
  }

  if (!url) {
    fail('NEXT_PUBLIC_SUPABASE_URL is not set.', [
      'Set it in .env.local, for example:',
      '',
      '  NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co',
    ]);
  }

  return { url, serviceRole };
}

/* --------------------------------------------------------------- import -- */

async function loadCatalogue() {
  const path = pathToFileURL(resolve(ROOT, 'src/data/catalog.ts')).href;
  try {
    return await import(path);
  } catch (error) {
    fail('The seed catalogue could not be loaded.', [
      'src/data/catalog.ts is imported directly through Node type stripping.',
      'That fails if the file gains non-erasable TypeScript (an enum, a namespace,',
      'or a parameter property) or a runtime import of an @/ path alias.',
      '',
      `Node reported: ${error?.message ?? error}`,
    ]);
  }
}

async function loadSettings() {
  const path = pathToFileURL(resolve(ROOT, 'src/app/admin/_data/settings.ts')).href;
  try {
    const loaded = await import(path);
    return loaded.defaultSettings;
  } catch (error) {
    log.warn(`Store settings were skipped: ${error?.message ?? error}`);
    return null;
  }
}

/* ------------------------------------------------------------ db helpers -- */

/**
 * Every write funnels through here so a missing migration produces one clear
 * sentence rather than forty PostgREST error objects.
 */
function guard(table, error) {
  if (!error) return;

  if (error.code === '42P01' || /does not exist/i.test(error.message ?? '')) {
    fail(`The table "${table}" does not exist.`, [
      'The schema has not been applied to this project yet. Run:',
      '',
      '  supabase db push',
      '',
      'or paste supabase/migrations/0001_init.sql into the Supabase SQL editor.',
    ]);
  }

  const message = error.message ?? String(error);
  fail(`Writing to "${table}" failed.`, [
    message,
    error.details && error.details !== message ? `Details: ${error.details}` : '',
    error.hint ? `Hint: ${error.hint}` : '',
  ].filter(Boolean));
}

/** Upsert + read back the rows, so ids can be mapped to natural keys. */
async function upsert(db, table, rows, onConflict, returning = 'id') {
  if (rows.length === 0) return [];
  const { data, error } = await db
    .from(table)
    .upsert(rows, { onConflict })
    .select(returning);
  guard(table, error);
  return data ?? [];
}

async function replaceChildren(db, table, productId, rows) {
  const { error: deleteError } = await db.from(table).delete().eq('product_id', productId);
  guard(table, deleteError);
  if (rows.length === 0) return 0;
  const { error } = await db.from(table).insert(rows);
  guard(table, error);
  return rows.length;
}

/** slug -> id, from a `select('id, slug')` result. */
function indexBy(rows, key) {
  return new Map(rows.map((row) => [row[key], row.id]));
}

/* ------------------------------------------------------------ catalogue -- */

async function seedTaxonomy(db, catalogue) {
  log.step('Taxonomy');

  const categories = await upsert(
    db,
    'categories',
    catalogue.categories.map((category) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      position: category.position,
    })),
    'slug',
    'id, slug',
  );
  log.ok(`${categories.length} categories`);

  const collections = await upsert(
    db,
    'collections',
    catalogue.collections.map((collection) => ({
      slug: collection.slug,
      name: collection.name,
      tagline: collection.tagline,
      description: collection.description,
      hero_image: collection.heroImage,
      position: collection.position,
    })),
    'slug',
    'id, slug',
  );
  log.ok(`${collections.length} collections`);

  return { categoryIds: indexBy(categories, 'slug'), collectionIds: indexBy(collections, 'slug') };
}

async function seedProducts(db, catalogue, categoryIds, collectionIds) {
  log.step('Products');

  const rows = catalogue.products.map((product) => {
    const categoryId = categoryIds.get(product.categorySlug);
    if (!categoryId) {
      log.warn(`"${product.name}" references unknown category "${product.categorySlug}" — left uncategorised.`);
    }
    return {
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle,
      story: product.story,
      description: product.description,
      status: product.status,
      price: product.price,
      compare_at_price: product.compareAtPrice,
      currency: product.currency,
      category_id: categoryId ?? null,
      badges: product.badges,
      specs: product.specs,
      hotspots: product.hotspots,
      features: product.features,
      care: product.care,
      featured: product.featured,
      // Preserved so `products_full()` — which orders by createdAt — returns the
      // catalogue's intended order rather than the order rows happened to land.
      created_at: product.createdAt,
      updated_at: new Date().toISOString(),
    };
  });

  const inserted = await upsert(db, 'products', rows, 'slug', 'id, slug');
  const productIds = indexBy(inserted, 'slug');
  log.ok(`${inserted.length} products`);

  let variantCount = 0;
  let imageCount = 0;
  let modelCount = 0;
  let linkCount = 0;

  for (const product of catalogue.products) {
    const productId = productIds.get(product.slug);
    if (!productId) continue;

    /* -- collection membership ------------------------------------------- */
    const { error: unlinkError } = await db
      .from('product_collections')
      .delete()
      .eq('product_id', productId);
    guard('product_collections', unlinkError);

    const links = product.collectionSlugs
      .map((slug) => collectionIds.get(slug))
      .filter(Boolean)
      .map((collectionId) => ({ product_id: productId, collection_id: collectionId }));

    if (links.length > 0) {
      const { error } = await db.from('product_collections').insert(links);
      guard('product_collections', error);
      linkCount += links.length;
    }

    /* -- variants and stock ----------------------------------------------- */
    const variants = await upsert(
      db,
      'product_variants',
      product.variants.map((variant) => ({
        product_id: productId,
        sku: variant.sku,
        colorway: variant.colorway,
        color_hex: variant.colorHex,
        size: variant.size,
        price_override: variant.priceOverride,
        weight_grams: variant.weightGrams,
      })),
      'sku',
      'id, sku',
    );
    variantCount += variants.length;

    const variantIds = new Map(variants.map((row) => [row.sku, row.id]));

    // Inventory is keyed on the variant, so re-seeding *resets* stock to the
    // catalogue figure. That is the intent of a seed; it is also why this
    // script must never be pointed at a production project.
    await upsert(
      db,
      'inventory',
      product.variants
        .filter((variant) => variantIds.has(variant.sku))
        .map((variant) => ({
          variant_id: variantIds.get(variant.sku),
          stock: variant.stock,
          low_stock_threshold: 4,
          updated_at: new Date().toISOString(),
        })),
      'variant_id',
      'variant_id',
    );

    /* -- media ------------------------------------------------------------ */
    imageCount += await replaceChildren(
      db,
      'product_images',
      productId,
      product.images.map((image) => ({
        product_id: productId,
        url: image.url,
        alt: image.alt,
        kind: image.kind,
        colorway: image.colorway ?? null,
        position: image.position,
      })),
    );

    modelCount += await replaceChildren(
      db,
      'product_3d_models',
      productId,
      product.models.map((model) => ({
        product_id: productId,
        url: model.url,
        format: model.format,
        mode: model.mode,
        placeholder: model.placeholder,
        size_bytes: model.sizeBytes,
      })),
    );
  }

  log.ok(`${variantCount} variants with inventory`);
  log.ok(`${imageCount} images, ${modelCount} 3D models`);
  log.ok(`${linkCount} collection memberships`);
}

async function seedJournal(db, catalogue) {
  log.step('Journal');
  const rows = await upsert(
    db,
    'journal_posts',
    catalogue.journalPosts.map((post) => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      category: post.category,
      hero_image: post.heroImage,
      reading_minutes: post.readingMinutes,
      author: post.author,
      published_at: post.publishedAt,
    })),
    'slug',
    'id, slug',
  );
  log.ok(`${rows.length} posts`);
}

async function seedSettings(db, settings) {
  log.step('Store settings');
  if (!settings) {
    log.warn('No defaults available — settings left untouched.');
    return;
  }

  const rows = Object.entries(settings).map(([key, value]) => ({
    key,
    value,
    updated_at: new Date().toISOString(),
  }));

  await upsert(db, 'settings', rows, 'key', 'key');
  log.ok(`${rows.length} groups: ${rows.map((row) => row.key).join(', ')}`);
}

/* -------------------------------------------------------------- accounts -- */

/** Auth admin paginates; the demo project is small, but do not assume it. */
async function findUserByEmail(db, email) {
  const target = email.toLowerCase();
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((user) => (user.email ?? '').toLowerCase() === target);
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

/**
 * Creates the account if it is absent, and otherwise resets its password to
 * the configured value — so the credentials in `.env.local` are always the
 * credentials that work, however many times this has been run.
 */
async function ensureAccount(db, { email, password, fullName, role }) {
  if (!email || !password) {
    const prefix = role === 'admin' ? 'SEED_ADMIN' : 'SEED_CUSTOMER';
    log.warn(`Skipped the ${role} account — set ${prefix}_EMAIL and ${prefix}_PASSWORD to create it.`);
    return null;
  }

  const existing = await findUserByEmail(db, email);
  let userId = existing?.id ?? null;

  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error || !data?.user) {
      log.warn(`Could not create ${email}: ${error?.message ?? 'no user returned'}`);
      return null;
    }
    userId = data.user.id;
    log.ok(`Created ${email}`);
  } else {
    const { error } = await db.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (error) log.warn(`Could not reset the password for ${email}: ${error.message}`);
    else log.ok(`Reset ${email}`);
  }

  // `handle_new_user` creates the profile on sign-up. Upserting here covers
  // the restored-from-backup case where the trigger did not fire, and is the
  // only place `role` is ever promoted.
  const { error: profileError } = await db
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );

  guard('profiles', profileError);
  if (role === 'admin') log.ok(`${email} promoted to admin`);

  return userId;
}

async function seedAccounts(db) {
  log.step('Demo accounts');

  await ensureAccount(db, {
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
    fullName: 'VAYRO Admin',
    role: 'admin',
  });

  await ensureAccount(db, {
    email: process.env.SEED_CUSTOMER_EMAIL,
    password: process.env.SEED_CUSTOMER_PASSWORD,
    fullName: 'Demo Customer',
    role: 'customer',
  });
}

/* ------------------------------------------------------------------ main -- */

async function main() {
  assertNodeVersion();
  const { url, serviceRole } = requireEnv();

  console.log(`\nVAYRO — seeding ${new URL(url).host}`);

  const db = createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const [catalogue, settings] = await Promise.all([loadCatalogue(), loadSettings()]);

  const { categoryIds, collectionIds } = await seedTaxonomy(db, catalogue);
  await seedProducts(db, catalogue, categoryIds, collectionIds);
  await seedJournal(db, catalogue);
  await seedSettings(db, settings);
  await seedAccounts(db);

  log.step('Done');
  log.info('Re-run at any time — every write is an upsert on a natural key.');
  log.info('Storefront data now comes from Supabase; the demo-data notice will clear.');
  console.log('');
}

main().catch((error) => {
  fail('Seeding stopped unexpectedly.', [error?.stack ?? error?.message ?? String(error)]);
});
