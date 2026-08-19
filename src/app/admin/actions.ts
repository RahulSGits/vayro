'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { slugify } from '@/lib/utils';
import { asRows, str } from './_data/coerce';
import { adminDb, type AdminDb } from './_data/db';
import { isDemoMode } from './_data/queries';
import { DEMO_NOTICE, type ActionState } from './_data/action-state';
import {
  analyticsSettingsSchema, brandSettingsSchema, emailSettingsSchema, homepageSettingsSchema,
  shippingSettingsSchema, taxSettingsSchema, type SettingsGroup,
} from './_data/settings';

/* ==========================================================================
   Admin server actions.

   Every action, without exception:
     1. calls `requireAdmin()` first — Server Actions are reachable by direct
        POST, so route-level checks are not enough;
     2. validates its input with zod before it touches the database;
     3. returns a typed `ActionState` rather than throwing, so the form can
        show the message inline.

   In demo mode there is nothing to write to. Actions say so plainly instead of
   pretending to succeed.
   ========================================================================== */

function fail(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: 'error', message, fieldErrors };
}

function ok(message: string): ActionState {
  return { status: 'success', message };
}

function demo(): ActionState {
  return { status: 'demo', message: DEMO_NOTICE };
}

/** Flattens a ZodError into `{ fieldName: firstMessage }`. */
function fieldErrorsOf(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

function revalidateAdmin(...paths: string[]) {
  for (const path of ['/admin', ...paths]) revalidatePath(path);
}

/* ------------------------------------------------------------ form readers */

const text = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const checkbox = (form: FormData, key: string) => form.get(key) === 'on' || form.get(key) === 'true';
const integer = (form: FormData, key: string) => {
  const raw = text(form, key);
  if (raw === '') return Number.NaN;
  return Math.round(Number(raw));
};
/** Major units in the form, minor units in the database. Converted once, here. */
const money = (form: FormData, key: string) => {
  const raw = text(form, key);
  if (raw === '') return Number.NaN;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.round(value * 100) : Number.NaN;
};
const json = (form: FormData, key: string): unknown => {
  const raw = text(form, key);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
};

/* =============================================================== products = */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');

const variantInput = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, 'SKU required').max(40),
  colorway: z.string().min(1, 'Colourway required').max(40),
  colorHex: hexColor,
  size: z.string().min(1, 'Size required').max(16),
  priceOverride: z.number().int().min(0).nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10_000),
  weightGrams: z.number().int().min(0).max(100_000).nullable(),
});

const imageInput = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Image path required').max(300),
  alt: z.string().max(200).default(''),
  kind: z.enum(['editorial', 'technical', 'detail', 'flat']),
  colorway: z.string().max(40).nullable(),
  position: z.number().int().min(0).max(999),
});

const modelInput = z.object({
  id: z.string().optional(),
  url: z.string().min(1, 'Model path required').max(300),
  format: z.enum(['glb', 'gltf']),
  mode: z.enum(['default', 'transformation', 'exploded']),
  placeholder: z.boolean(),
});

const specInput = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
  group: z.enum(['materials', 'construction', 'dimensions', 'care', 'performance']),
});

const featureInput = z.object({
  title: z.string().min(1).max(80),
  body: z.string().min(1).max(400),
  icon: z.string().min(1).max(40),
});

const hotspotInput = z.object({
  id: z.string().optional(),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(300),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const productInput = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'Name required').max(90),
  slug: z.string().min(2, 'Slug required').max(90).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  subtitle: z.string().max(120).nullable(),
  story: z.string().max(4000).default(''),
  description: z.string().min(1, 'Description required').max(2000),
  status: z.enum(['draft', 'published', 'archived']),
  price: z.number().int().min(0, 'Price cannot be negative').max(1_000_000_000),
  compareAtPrice: z.number().int().min(0).max(1_000_000_000).nullable(),
  currency: z.enum(['INR', 'USD', 'EUR', 'GBP']),
  categorySlug: z.string().min(1, 'Choose a category'),
  collectionSlugs: z.array(z.string()).max(12),
  badges: z.array(z.string().max(40)).max(6),
  care: z.array(z.string().max(160)).max(12),
  featured: z.boolean(),
  variants: z.array(variantInput).min(1, 'At least one variant is required'),
  images: z.array(imageInput).min(1, 'At least one image is required'),
  models: z.array(modelInput).max(6),
  specs: z.array(specInput).max(40),
  features: z.array(featureInput).max(12),
  hotspots: z.array(hotspotInput).max(12),
});

export type ProductInput = z.infer<typeof productInput>;

function readProductForm(form: FormData) {
  const lines = (key: string) =>
    text(form, key).split('\n').map((line) => line.trim()).filter(Boolean);

  return productInput.safeParse({
    id: text(form, 'id') || undefined,
    name: text(form, 'name'),
    slug: text(form, 'slug') || slugify(text(form, 'name')),
    subtitle: text(form, 'subtitle') || null,
    story: text(form, 'story'),
    description: text(form, 'description'),
    status: text(form, 'status'),
    price: money(form, 'price'),
    compareAtPrice: text(form, 'compareAtPrice') ? money(form, 'compareAtPrice') : null,
    currency: text(form, 'currency'),
    categorySlug: text(form, 'categorySlug'),
    collectionSlugs: form.getAll('collectionSlugs').map(String).filter(Boolean),
    badges: lines('badges'),
    care: lines('care'),
    featured: checkbox(form, 'featured'),
    variants: json(form, 'variants'),
    images: json(form, 'images'),
    models: json(form, 'models'),
    specs: json(form, 'specs'),
    features: json(form, 'features'),
    hotspots: json(form, 'hotspots'),
  });
}

/** Resolves slugs to ids so the form can speak in slugs and the schema in uuids. */
async function resolveTaxonomy(client: AdminDb, categorySlug: string, collectionSlugs: string[]) {
  const [categoryResult, collectionResult] = await Promise.all([
    client.from('categories').select('id').eq('slug', categorySlug).maybeSingle(),
    collectionSlugs.length
      ? client.from('collections').select('id, slug').in('slug', collectionSlugs)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const categoryRow = categoryResult.data as { id?: string } | null;
  const collectionRows = (collectionResult.data ?? []) as { id?: string }[];
  return {
    categoryId: typeof categoryRow?.id === 'string' ? categoryRow.id : null,
    collectionIds: collectionRows.map((row) => row.id).filter((id): id is string => typeof id === 'string'),
  };
}

export async function saveProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = readProductForm(form);
  if (!parsed.success) {
    return fail('Check the highlighted fields.', fieldErrorsOf(parsed.error));
  }
  const input = parsed.data;

  const skus = input.variants.map((variant) => variant.sku.toUpperCase());
  if (new Set(skus).size !== skus.length) {
    return fail('Two variants share a SKU. Every SKU must be unique.', { variants: 'Duplicate SKU' });
  }

  if (await isDemoMode()) return demo();

  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { categoryId, collectionIds } = await resolveTaxonomy(client, input.categorySlug, input.collectionSlugs);
  if (!categoryId) return fail('That category no longer exists.', { categorySlug: 'Unknown category' });

  const productRow = {
    slug: input.slug,
    name: input.name,
    subtitle: input.subtitle,
    story: input.story,
    description: input.description,
    status: input.status,
    price: input.price,
    compare_at_price: input.compareAtPrice,
    currency: input.currency,
    category_id: categoryId,
    badges: input.badges,
    specs: input.specs,
    hotspots: input.hotspots,
    features: input.features,
    care: input.care,
    featured: input.featured,
    updated_at: new Date().toISOString(),
  };

  let productId = input.id ?? '';
  if (productId) {
    const { error } = await client.from('products').update(productRow).eq('id', productId);
    if (error) return fail(`Could not save the product: ${error.message}`);
  } else {
    const { data, error } = await client.from('products').insert(productRow).select('id').single();
    if (error) return fail(`Could not create the product: ${error.message}`);
    const inserted = data as { id?: string } | null;
    if (!inserted?.id) return fail('The product was created but no id came back.');
    productId = inserted.id;
  }

  /* ---- collections: replace the join set ------------------------------- */
  await client.from('product_collections').delete().eq('product_id', productId);
  if (collectionIds.length) {
    const { error } = await client.from('product_collections')
      .insert(collectionIds.map((collectionId) => ({ product_id: productId, collection_id: collectionId })));
    if (error) return fail(`Product saved, but collections failed: ${error.message}`);
  }

  /* ---- variants + inventory -------------------------------------------- */
  const keptVariantIds: string[] = [];
  for (const variant of input.variants) {
    const variantRow = {
      product_id: productId,
      sku: variant.sku.toUpperCase(),
      colorway: variant.colorway,
      color_hex: variant.colorHex,
      size: variant.size,
      price_override: variant.priceOverride,
      weight_grams: variant.weightGrams,
    };

    let variantId = variant.id ?? '';
    if (variantId) {
      const { error } = await client.from('product_variants').update(variantRow).eq('id', variantId);
      if (error) return fail(`Could not save variant ${variant.sku}: ${error.message}`);
    } else {
      const { data, error } = await client.from('product_variants').insert(variantRow).select('id').single();
      if (error) return fail(`Could not create variant ${variant.sku}: ${error.message}`);
      const inserted = data as { id?: string } | null;
      if (!inserted?.id) return fail(`Variant ${variant.sku} was created but no id came back.`);
      variantId = inserted.id;
    }
    keptVariantIds.push(variantId);

    const { error: inventoryError } = await client.from('inventory').upsert(
      { variant_id: variantId, stock: variant.stock, low_stock_threshold: variant.lowStockThreshold, updated_at: new Date().toISOString() },
      { onConflict: 'variant_id' },
    );
    if (inventoryError) return fail(`Could not save stock for ${variant.sku}: ${inventoryError.message}`);
  }

  const { data: existingVariants } = await client.from('product_variants').select('id').eq('product_id', productId);
  const removed = asRows(existingVariants)
    .map((row) => str(row.id))
    .filter((id) => id !== '' && !keptVariantIds.includes(id));
  if (removed.length) await client.from('product_variants').delete().in('id', removed);

  /* ---- images + 3D models: authored as a whole, replaced as a whole ----- */
  await client.from('product_images').delete().eq('product_id', productId);
  if (input.images.length) {
    const { error } = await client.from('product_images').insert(
      input.images.map((image, index) => ({
        product_id: productId,
        url: image.url,
        alt: image.alt,
        kind: image.kind,
        colorway: image.colorway,
        position: image.position || index + 1,
      })),
    );
    if (error) return fail(`Product saved, but images failed: ${error.message}`);
  }

  await client.from('product_3d_models').delete().eq('product_id', productId);
  if (input.models.length) {
    const { error } = await client.from('product_3d_models').insert(
      input.models.map((model) => ({
        product_id: productId,
        url: model.url,
        format: model.format,
        mode: model.mode,
        placeholder: model.placeholder,
      })),
    );
    if (error) return fail(`Product saved, but 3D models failed: ${error.message}`);
  }

  revalidateAdmin('/admin/products', `/admin/products/${productId}`, '/shop', `/products/${input.slug}`, '/');

  if (!input.id) redirect(`/admin/products/${productId}`);
  return ok(`${input.name} saved.`);
}

const statusInput = z.object({
  id: z.string().min(1),
  status: z.enum(['draft', 'published', 'archived']),
});

export async function setProductStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = statusInput.safeParse({ id: text(form, 'id'), status: text(form, 'status') });
  if (!parsed.success) return fail('That status is not valid.');

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('products')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);
  if (error) return fail(`Could not update the product: ${error.message}`);

  revalidateAdmin('/admin/products', `/admin/products/${parsed.data.id}`, '/shop', '/');
  return ok(parsed.data.status === 'published' ? 'Product published.' : `Product moved to ${parsed.data.status}.`);
}

export async function setProductFeatured(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), featured: z.boolean() })
    .safeParse({ id: text(form, 'id'), featured: text(form, 'featured') === 'true' });
  if (!parsed.success) return fail('That request is not valid.');

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('products')
    .update({ featured: parsed.data.featured, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);
  if (error) return fail(`Could not update the product: ${error.message}`);

  revalidateAdmin('/admin/products', '/admin/content', '/');
  return ok(parsed.data.featured ? 'Added to featured.' : 'Removed from featured.');
}

export async function deleteProduct(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(form, 'id');
  if (!id) return fail('No product was identified.');
  if (text(form, 'confirm') !== 'DELETE') {
    return fail('Type DELETE to confirm.', { confirm: 'Type DELETE to confirm' });
  }

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('products').delete().eq('id', id);
  if (error) return fail(`Could not delete the product: ${error.message}`);

  revalidateAdmin('/admin/products', '/shop', '/');
  redirect('/admin/products');
}

/* ================================================================= orders = */

const orderStatusInput = z.object({
  id: z.string().min(1),
  status: z.enum(['pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']),
});

export async function updateOrderStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = orderStatusInput.safeParse({ id: text(form, 'id'), status: text(form, 'status') });
  if (!parsed.success) return fail('That status transition is not valid.');

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('orders')
    .update({ status: parsed.data.status, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);
  if (error) return fail(`Could not update the order: ${error.message}`);

  revalidateAdmin('/admin/orders', `/admin/orders/${parsed.data.id}`, '/account/orders');
  return ok(`Order marked ${parsed.data.status}.`);
}

const fulfilmentInput = z.object({
  id: z.string().min(1),
  carrier: z.string().max(60),
  trackingNumber: z.string().max(60),
  notes: z.string().max(1000),
});

export async function updateOrderFulfilment(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = fulfilmentInput.safeParse({
    id: text(form, 'id'),
    carrier: text(form, 'carrier'),
    trackingNumber: text(form, 'trackingNumber'),
    notes: text(form, 'notes'),
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsOf(parsed.error));

  if (parsed.data.trackingNumber && !parsed.data.carrier) {
    return fail('A tracking number needs a carrier.', { carrier: 'Choose a carrier' });
  }

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('orders').update({
    carrier: parsed.data.carrier || null,
    tracking_number: parsed.data.trackingNumber || null,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  }).eq('id', parsed.data.id);
  if (error) return fail(`Could not update the order: ${error.message}`);

  revalidateAdmin('/admin/orders', `/admin/orders/${parsed.data.id}`);
  return ok('Fulfilment details saved.');
}

/* ============================================================== inventory = */

const stockInput = z.object({
  variantId: z.string().min(1),
  stock: z.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.number().int().min(0).max(10_000),
});

export async function updateStock(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = stockInput.safeParse({
    variantId: text(form, 'variantId'),
    stock: integer(form, 'stock'),
    lowStockThreshold: integer(form, 'lowStockThreshold'),
  });
  if (!parsed.success) return fail('Enter a whole number of units.', fieldErrorsOf(parsed.error));

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('inventory').upsert({
    variant_id: parsed.data.variantId,
    stock: parsed.data.stock,
    low_stock_threshold: parsed.data.lowStockThreshold,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'variant_id' });
  if (error) return fail(`Could not update stock: ${error.message}`);

  revalidateAdmin('/admin/inventory', '/admin/products', '/shop');
  return ok('Stock updated.');
}

/* ================================================================ content = */

const journalInput = z.object({
  id: z.string().optional(),
  slug: z.string().min(2).max(90).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  title: z.string().min(2, 'Title required').max(140),
  excerpt: z.string().min(1, 'Excerpt required').max(300),
  body: z.string().min(1, 'Body required').max(40_000),
  category: z.string().min(1).max(60),
  heroImage: z.string().max(300).nullable(),
  readingMinutes: z.number().int().min(1).max(90),
  author: z.string().min(1).max(80),
  published: z.boolean(),
});

export async function saveJournalPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = journalInput.safeParse({
    id: text(form, 'id') || undefined,
    slug: text(form, 'slug') || slugify(text(form, 'title')),
    title: text(form, 'title'),
    excerpt: text(form, 'excerpt'),
    body: text(form, 'body'),
    category: text(form, 'category'),
    heroImage: text(form, 'heroImage') || null,
    readingMinutes: integer(form, 'readingMinutes'),
    author: text(form, 'author'),
    published: checkbox(form, 'published'),
  });
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsOf(parsed.error));

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const row = {
    slug: parsed.data.slug,
    title: parsed.data.title,
    excerpt: parsed.data.excerpt,
    body: parsed.data.body,
    category: parsed.data.category,
    hero_image: parsed.data.heroImage,
    reading_minutes: parsed.data.readingMinutes,
    author: parsed.data.author,
    published_at: parsed.data.published ? new Date().toISOString() : null,
  };

  if (parsed.data.id) {
    // Keep the original publication date when a published post is re-saved.
    const { data: existing } = await client.from('journal_posts')
      .select('published_at').eq('id', parsed.data.id).maybeSingle();
    const previous = (existing as { published_at?: string | null } | null)?.published_at ?? null;
    if (parsed.data.published && previous) row.published_at = previous;

    const { error } = await client.from('journal_posts').update(row).eq('id', parsed.data.id);
    if (error) return fail(`Could not save the post: ${error.message}`);
  } else {
    const { error } = await client.from('journal_posts').insert(row);
    if (error) return fail(`Could not create the post: ${error.message}`);
  }

  revalidateAdmin('/admin/content', '/journal', `/journal/${parsed.data.slug}`);
  return ok(parsed.data.published ? 'Post published.' : 'Draft saved.');
}

export async function deleteJournalPost(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = text(form, 'id');
  if (!id) return fail('No post was identified.');

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('journal_posts').delete().eq('id', id);
  if (error) return fail(`Could not delete the post: ${error.message}`);

  revalidateAdmin('/admin/content', '/journal');
  return ok('Post deleted.');
}

/* =============================================================== settings = */

const groupSchemas = {
  brand: brandSettingsSchema,
  shipping: shippingSettingsSchema,
  tax: taxSettingsSchema,
  email: emailSettingsSchema,
  analytics: analyticsSettingsSchema,
  homepage: homepageSettingsSchema,
} as const;

function readSettingsGroup(group: SettingsGroup, form: FormData): unknown {
  switch (group) {
    case 'brand':
      return {
        storeName: text(form, 'storeName'),
        tagline: text(form, 'tagline'),
        supportEmail: text(form, 'supportEmail'),
        supportPhone: text(form, 'supportPhone'),
        currency: text(form, 'currency'),
        originCity: text(form, 'originCity'),
      };
    case 'shipping':
      return {
        freeThreshold: money(form, 'freeThreshold'),
        standardRate: money(form, 'standardRate'),
        expressRate: money(form, 'expressRate'),
        standardLabel: text(form, 'standardLabel'),
        expressLabel: text(form, 'expressLabel'),
        processingDays: integer(form, 'processingDays'),
        internationalEnabled: checkbox(form, 'internationalEnabled'),
        internationalRate: money(form, 'internationalRate'),
      };
    case 'tax':
      return {
        label: text(form, 'label'),
        rateBasisPoints: Math.round(Number(text(form, 'ratePercent') || 'NaN') * 100),
        pricesIncludeTax: checkbox(form, 'pricesIncludeTax'),
        registrationId: text(form, 'registrationId'),
      };
    case 'email':
      return {
        fromName: text(form, 'fromName'),
        fromAddress: text(form, 'fromAddress'),
        replyTo: text(form, 'replyTo'),
        orderConfirmation: checkbox(form, 'orderConfirmation'),
        shippingNotification: checkbox(form, 'shippingNotification'),
        abandonedCart: checkbox(form, 'abandonedCart'),
      };
    case 'analytics':
      return {
        serverSideEvents: checkbox(form, 'serverSideEvents'),
        retentionDays: integer(form, 'retentionDays'),
        excludeAdminTraffic: checkbox(form, 'excludeAdminTraffic'),
      };
    case 'homepage':
      return {
        eyebrow: text(form, 'eyebrow'),
        headline: text(form, 'headline'),
        subhead: text(form, 'subhead'),
        ctaLabel: text(form, 'ctaLabel'),
        ctaHref: text(form, 'ctaHref'),
        announcementEnabled: checkbox(form, 'announcementEnabled'),
        announcementText: text(form, 'announcementText'),
      };
  }
}

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  await requireAdmin();

  const groupResult = z.enum(['brand', 'shipping', 'tax', 'email', 'analytics', 'homepage'])
    .safeParse(text(form, 'group'));
  if (!groupResult.success) return fail('Unknown settings group.');
  const group = groupResult.data;

  const parsed = groupSchemas[group].safeParse(readSettingsGroup(group, form));
  if (!parsed.success) return fail('Check the highlighted fields.', fieldErrorsOf(parsed.error));

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('settings').upsert(
    { key: group, value: parsed.data, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) return fail(`Could not save settings: ${error.message}`);

  revalidateAdmin('/admin/settings', '/admin/content', '/');
  return ok('Settings saved.');
}

/* ============================================================== customers = */

export async function setCustomerRole(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { profile } = await requireAdmin();
  const parsed = z.object({ id: z.string().min(1), role: z.enum(['customer', 'admin']) })
    .safeParse({ id: text(form, 'id'), role: text(form, 'role') });
  if (!parsed.success) return fail('That role is not valid.');

  if (parsed.data.id === profile.id) {
    return fail('You cannot change your own role. Ask another administrator.');
  }

  if (await isDemoMode()) return demo();
  const client = await adminDb();
  if (!client) return fail('No database connection is configured.');

  const { error } = await client.from('profiles')
    .update({ role: parsed.data.role, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.id);
  if (error) return fail(`Could not update the customer: ${error.message}`);

  revalidateAdmin('/admin/customers', `/admin/customers/${parsed.data.id}`);
  return ok(parsed.data.role === 'admin' ? 'Administrator access granted.' : 'Administrator access revoked.');
}
