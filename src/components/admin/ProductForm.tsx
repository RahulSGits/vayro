'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { cn, formatPrice, slugify } from '@/lib/utils';
import type { Category, Collection } from '@/types';
import type { AdminProduct } from '@/app/admin/_data/queries';
import type { ActionState } from '@/app/admin/_data/action-state';
import { saveProduct } from '@/app/admin/actions';
import { ActionForm, FieldGrid, FormBar, SubmitButton } from './Form';

/* ==========================================================================
   Product editor.

   Scalar fields are plain inputs — they submit without JavaScript. The
   repeatable collections (variants, images, models, specs, features,
   hotspots) are edited in React state and serialised into hidden JSON inputs,
   which the server action re-validates with zod before anything is written.
   Nothing here trusts the client; the form is a convenience, not a gate.
   ========================================================================== */

/** Art-directed plates that ship in /public/media. Offered, never enforced. */
const MEDIA_PLATES = [
  'field-ridgeline', 'field-dusk', 'field-highpass', 'field-coastal', 'field-transit',
  'field-ascent', 'field-treeline',
  'material-ripstop', 'material-twill', 'material-shell', 'material-liner',
  'studio-dark', 'studio-light', 'studio-forest', 'studio-stone',
].map((name) => `/media/${name}.webp`);

const SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const SPEC_GROUPS = ['materials', 'construction', 'dimensions', 'care', 'performance'] as const;
const IMAGE_KINDS = ['technical', 'editorial', 'detail', 'flat'] as const;
const MODEL_MODES = ['default', 'transformation', 'exploded'] as const;

type VariantRow = {
  id?: string;
  sku: string;
  colorway: string;
  colorHex: string;
  size: string;
  priceOverride: number | null;
  stock: number;
  lowStockThreshold: number;
  weightGrams: number | null;
};
type ImageRow = { id?: string; url: string; alt: string; kind: (typeof IMAGE_KINDS)[number]; colorway: string | null; position: number };
type ModelRow = { id?: string; url: string; format: 'glb' | 'gltf'; mode: (typeof MODEL_MODES)[number]; placeholder: boolean };
type SpecRow = { label: string; value: string; group: (typeof SPEC_GROUPS)[number] };
type FeatureRow = { title: string; body: string; icon: string };
type HotspotRow = { id?: string; title: string; body: string; x: number; y: number };

const cellInput = 'py-1.5 text-[0.8125rem] border-b border-[var(--border)] focus:border-[var(--fg)]';

function SectionHead({ index, title, description }: { index: string; title: string; description: string }) {
  return (
    <div className="mb-7 flex gap-5 border-b border-[var(--border)] pb-5">
      <span className="t-spec pt-1 text-[var(--fg-subtle)]">{index}</span>
      <div className="min-w-0">
        <h2 className="t-h3">{title}</h2>
        <p className="t-caption t-pretty mt-1.5 max-w-[58ch] text-[var(--fg-muted)]">{description}</p>
      </div>
    </div>
  );
}

function RowActions({ onRemove, label }: { onRemove: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--danger)]"
    >
      <Trash2 size={14} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
    </button>
  );
}

function AddRow({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" variant="secondary" size="xs" onClick={onClick} className="mt-5">
      <Plus size={13} strokeWidth={1.4} strokeLinecap="square" aria-hidden />
      {children}
    </Button>
  );
}

export function ProductForm({
  product,
  categories,
  collections,
  demo,
}: {
  product: AdminProduct | null;
  categories: Category[];
  collections: Collection[];
  demo: boolean;
}) {
  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(Boolean(product));

  const [variants, setVariants] = useState<VariantRow[]>(
    product?.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      colorway: variant.colorway,
      colorHex: variant.colorHex,
      size: variant.size,
      priceOverride: variant.priceOverride,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      weightGrams: variant.weightGrams,
    })) ?? [],
  );
  const [images, setImages] = useState<ImageRow[]>(
    product?.images.map((image) => ({
      id: image.id,
      url: image.url,
      alt: image.alt,
      kind: image.kind,
      colorway: image.colorway ?? null,
      position: image.position,
    })) ?? [],
  );
  const [models, setModels] = useState<ModelRow[]>(
    product?.models.map((model) => ({
      id: model.id, url: model.url, format: model.format, mode: model.mode, placeholder: model.placeholder,
    })) ?? [],
  );
  const [specs, setSpecs] = useState<SpecRow[]>(product?.specs.map((spec) => ({ ...spec })) ?? []);
  const [features, setFeatures] = useState<FeatureRow[]>(product?.features.map((feature) => ({ ...feature })) ?? []);
  const [hotspots, setHotspots] = useState<HotspotRow[]>(product?.hotspots.map((hotspot) => ({
    id: hotspot.id, title: hotspot.title, body: hotspot.body, x: hotspot.x, y: hotspot.y,
  })) ?? []);

  const colorways = useMemo(
    () => [...new Set(variants.map((variant) => variant.colorway).filter(Boolean))],
    [variants],
  );

  const effectiveSlug = slugTouched ? slug : slugify(name);
  const totalStock = variants.reduce((sum, variant) => sum + (Number.isFinite(variant.stock) ? variant.stock : 0), 0);

  const patch = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (index: number, next: Partial<T>) =>
      setter((rows) => rows.map((row, position) => (position === index ? { ...row, ...next } : row)));
  const drop = <T,>(setter: React.Dispatch<React.SetStateAction<T[]>>) =>
    (index: number) => setter((rows) => rows.filter((_, position) => position !== index));

  const patchVariant = patch(setVariants);
  const patchImage = patch(setImages);
  const patchModel = patch(setModels);
  const patchSpec = patch(setSpecs);
  const patchFeature = patch(setFeatures);
  const patchHotspot = patch(setHotspots);

  const error = (state: ActionState, key: string) => state.fieldErrors?.[key];

  return (
    <ActionForm action={saveProduct} className="pb-4">
      {(state) => (
        <>
          {product ? <input type="hidden" name="id" value={product.id} /> : null}
          <input type="hidden" name="variants" value={JSON.stringify(variants)} />
          <input type="hidden" name="images" value={JSON.stringify(images)} />
          <input type="hidden" name="models" value={JSON.stringify(models)} />
          <input type="hidden" name="specs" value={JSON.stringify(specs)} />
          <input type="hidden" name="features" value={JSON.stringify(features)} />
          <input type="hidden" name="hotspots" value={JSON.stringify(hotspots)} />

          {/* ---------------------------------------------------- 01 basics */}
          <section className="pt-10">
            <SectionHead
              index="01"
              title="Identity"
              description="How the piece is named, addressed and priced. The slug becomes the product URL — changing it on a live product breaks existing links."
            />
            <FieldGrid>
              <Field label="Name" required error={error(state, 'name')}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id} name="name" value={name} required maxLength={90}
                    aria-describedby={describedBy} aria-invalid={invalid}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Meridian Carry Shell"
                  />
                )}
              </Field>

              <Field label="Slug" required hint="Lowercase, hyphenated." error={error(state, 'slug')}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id} name="slug" value={effectiveSlug} required maxLength={90}
                    aria-describedby={describedBy} aria-invalid={invalid}
                    onFocus={() => setSlugTouched(true)}
                    onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }}
                    className="t-spec"
                  />
                )}
              </Field>

              <Field label="Subtitle" hint="The one-line claim shown under the name." error={error(state, 'subtitle')}>
                {({ id, describedBy }) => (
                  <Input id={id} name="subtitle" defaultValue={product?.subtitle ?? ''} maxLength={120}
                    aria-describedby={describedBy} placeholder="One layer. Every destination." />
                )}
              </Field>

              <Field label="Status" required error={error(state, 'status')}>
                {({ id }) => (
                  <Select id={id} name="status" defaultValue={product?.status ?? 'draft'}>
                    <option value="draft">Draft — not visible on the storefront</option>
                    <option value="published">Published — live</option>
                    <option value="archived">Archived — hidden, kept for records</option>
                  </Select>
                )}
              </Field>

              <Field label="Price" required hint="In major units. ₹5,999 is entered as 5999." error={error(state, 'price')}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id} name="price" type="number" inputMode="decimal" min={0} step="0.01" required
                    defaultValue={product ? product.price / 100 : ''}
                    aria-describedby={describedBy} aria-invalid={invalid} className="t-spec"
                  />
                )}
              </Field>

              <Field label="Compare-at price" hint="Leave blank unless the piece is genuinely reduced." error={error(state, 'compareAtPrice')}>
                {({ id, describedBy }) => (
                  <Input
                    id={id} name="compareAtPrice" type="number" inputMode="decimal" min={0} step="0.01"
                    defaultValue={product?.compareAtPrice ? product.compareAtPrice / 100 : ''}
                    aria-describedby={describedBy} className="t-spec"
                  />
                )}
              </Field>

              <Field label="Currency" required>
                {({ id }) => (
                  <Select id={id} name="currency" defaultValue={product?.currency ?? 'INR'}>
                    <option value="INR">INR — Indian rupee</option>
                    <option value="USD">USD — US dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — Pound sterling</option>
                  </Select>
                )}
              </Field>

              <Field label="Category" required error={error(state, 'categorySlug')}>
                {({ id }) => (
                  <Select id={id} name="categorySlug" defaultValue={product?.categorySlug ?? categories[0]?.slug ?? ''}>
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>{category.name}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </FieldGrid>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              <fieldset>
                <legend className="t-label mb-4 text-[var(--fg-muted)]">Collections</legend>
                <div className="flex flex-col gap-3">
                  {collections.map((collection) => (
                    <Checkbox
                      key={collection.slug}
                      name="collectionSlugs"
                      value={collection.slug}
                      defaultChecked={product?.collectionSlugs.includes(collection.slug) ?? false}
                      label={<span>{collection.name} <span className="t-spec text-[var(--fg-subtle)]">/{collection.slug}</span></span>}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="flex flex-col gap-7">
                <Field label="Badges" hint="One per line. Kept short and factual — no marketing claims.">
                  {({ id, describedBy }) => (
                    <Textarea id={id} name="badges" rows={3} aria-describedby={describedBy}
                      defaultValue={product?.badges.join('\n') ?? ''} placeholder={'Integrated carry\nPacks to 2.1L'} />
                  )}
                </Field>
                <Checkbox
                  name="featured"
                  defaultChecked={product?.featured ?? false}
                  label="Feature on the homepage and in editorial modules"
                />
              </div>
            </div>
          </section>

          {/* ------------------------------------------------------ 02 copy */}
          <section className="pt-14">
            <SectionHead
              index="02"
              title="Copy"
              description="The description sells the object; the story explains the thinking. Write to the catalogue, never beyond it — every claim here must be supported by a specification below."
            />
            <div className="flex flex-col gap-7">
              <Field label="Description" required error={error(state, 'description')}>
                {({ id, describedBy, invalid }) => (
                  <Textarea id={id} name="description" rows={3} required maxLength={2000}
                    aria-describedby={describedBy} aria-invalid={invalid}
                    defaultValue={product?.description ?? ''} />
                )}
              </Field>
              <Field label="Story" hint="Long form. Blank lines separate paragraphs.">
                {({ id, describedBy }) => (
                  <Textarea id={id} name="story" rows={8} maxLength={4000}
                    aria-describedby={describedBy} defaultValue={product?.story ?? ''} />
                )}
              </Field>
              <Field label="Care" hint="One instruction per line.">
                {({ id, describedBy }) => (
                  <Textarea id={id} name="care" rows={4} aria-describedby={describedBy}
                    defaultValue={product?.care.join('\n') ?? ''}
                    placeholder={'Machine wash cold, gentle cycle.\nDo not tumble dry.'} />
                )}
              </Field>
            </div>
          </section>

          {/* -------------------------------------------------- 03 variants */}
          <section className="pt-14">
            <SectionHead
              index="03"
              title="Variants and stock"
              description="Every purchasable combination of colourway and size, with its own SKU and stock count. A variant at or below its low-stock threshold is flagged across the admin."
            />

            <div className="w-full overflow-x-auto" tabIndex={0} role="group" aria-label="Variants">
              <table className="w-full min-w-[56rem] text-left">
                <caption className="sr-only">Product variants</caption>
                <thead className="border-b border-[var(--border)]">
                  <tr>
                    {['SKU', 'Colourway', 'Hex', 'Size', 'Stock', 'Low at', 'Price override', 'Grams', ''].map((heading) => (
                      <th key={heading} scope="col" className="t-label-sm px-2 py-3 font-medium text-[var(--fg-subtle)]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {variants.map((variant, index) => (
                    <tr key={`${variant.id ?? 'new'}-${index}`}>
                      <td className="px-2 py-2">
                        <Input aria-label={`SKU for row ${index + 1}`} value={variant.sku} className={cn(cellInput, 't-spec w-32')}
                          onChange={(event) => patchVariant(index, { sku: event.target.value.toUpperCase() })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Colourway for row ${index + 1}`} value={variant.colorway} className={cn(cellInput, 'w-32')}
                          onChange={(event) => patchVariant(index, { colorway: event.target.value })} />
                      </td>
                      <td className="px-2 py-2">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="h-4 w-4 shrink-0 border border-[var(--border-strong)]" style={{ backgroundColor: variant.colorHex }} />
                          <Input aria-label={`Colour hex for row ${index + 1}`} value={variant.colorHex} className={cn(cellInput, 't-spec w-24')}
                            onChange={(event) => patchVariant(index, { colorHex: event.target.value })} />
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Size for row ${index + 1}`} value={variant.size} list="vayro-sizes" className={cn(cellInput, 'w-20')}
                          onChange={(event) => patchVariant(index, { size: event.target.value })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Stock for row ${index + 1}`} type="number" min={0} value={variant.stock} className={cn(cellInput, 't-spec w-20')}
                          onChange={(event) => patchVariant(index, { stock: Math.max(0, Math.round(Number(event.target.value) || 0)) })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Low stock threshold for row ${index + 1}`} type="number" min={0} value={variant.lowStockThreshold} className={cn(cellInput, 't-spec w-20')}
                          onChange={(event) => patchVariant(index, { lowStockThreshold: Math.max(0, Math.round(Number(event.target.value) || 0)) })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Price override for row ${index + 1}`} type="number" min={0} step="0.01"
                          value={variant.priceOverride === null ? '' : variant.priceOverride / 100}
                          className={cn(cellInput, 't-spec w-28')}
                          onChange={(event) => patchVariant(index, {
                            priceOverride: event.target.value === '' ? null : Math.round(Number(event.target.value) * 100),
                          })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Weight in grams for row ${index + 1}`} type="number" min={0}
                          value={variant.weightGrams ?? ''} className={cn(cellInput, 't-spec w-20')}
                          onChange={(event) => patchVariant(index, {
                            weightGrams: event.target.value === '' ? null : Math.max(0, Math.round(Number(event.target.value))),
                          })} />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <RowActions onRemove={() => drop(setVariants)(index)} label={`Remove variant ${variant.sku || index + 1}`} />
                      </td>
                    </tr>
                  ))}
                  {variants.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-2 py-10 text-center">
                        <p className="t-body-sm text-[var(--fg-muted)]">No variants yet. A product needs at least one.</p>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <datalist id="vayro-sizes">
              {SIZE_SUGGESTIONS.map((size) => <option key={size} value={size} />)}
            </datalist>

            <div className="flex flex-wrap items-center gap-4">
              <AddRow
                onClick={() => setVariants((rows) => [...rows, {
                  sku: '', colorway: rows.at(-1)?.colorway ?? '', colorHex: rows.at(-1)?.colorHex ?? '#0B0C0B',
                  size: '', priceOverride: null, stock: 0, lowStockThreshold: 4, weightGrams: null,
                }])}
              >
                Add variant
              </AddRow>
              <p className="t-spec mt-5 text-[var(--fg-subtle)]">
                {variants.length} {variants.length === 1 ? 'variant' : 'variants'} · {totalStock} units
              </p>
            </div>
            {error(state, 'variants') ? (
              <p role="alert" className="t-caption mt-3 text-[var(--danger)]">{error(state, 'variants')}</p>
            ) : null}
          </section>

          {/* ---------------------------------------------------- 04 media */}
          <section className="pt-14">
            <SectionHead
              index="04"
              title="Imagery and 3D"
              description="Images are ordered by position and typed by role — technical drives the product views, editorial drives the lifestyle galleries. Model files are Draco-compressed GLB."
            />

            <div className="flex flex-col gap-5">
              {images.map((image, index) => (
                <div key={`${image.id ?? 'new'}-${index}`} className="flex flex-wrap gap-5 border border-[var(--border)] p-4">
                  <div className="relative h-24 w-20 shrink-0 overflow-hidden bg-[var(--bg-sunken)]">
                    {image.url.startsWith('/') ? (
                      <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
                    ) : (
                      <span className="t-spec flex h-full items-center justify-center px-1 text-center text-[var(--fg-subtle)]">
                        no preview
                      </span>
                    )}
                  </div>
                  <div className="grid min-w-[16rem] flex-1 gap-4 sm:grid-cols-2">
                    <Field label="Path">
                      {({ id }) => (
                        <Input id={id} value={image.url} list="vayro-media" className="t-spec"
                          onChange={(event) => patchImage(index, { url: event.target.value })} />
                      )}
                    </Field>
                    <Field label="Alt text" hint="Describe what is shown, not the brand.">
                      {({ id }) => (
                        <Input id={id} value={image.alt}
                          onChange={(event) => patchImage(index, { alt: event.target.value })} />
                      )}
                    </Field>
                    <Field label="Role">
                      {({ id }) => (
                        <Select id={id} value={image.kind}
                          onChange={(event) => patchImage(index, { kind: event.target.value as ImageRow['kind'] })}>
                          {IMAGE_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
                        </Select>
                      )}
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                      <Field label="Colourway">
                        {({ id }) => (
                          <Select id={id} value={image.colorway ?? ''}
                            onChange={(event) => patchImage(index, { colorway: event.target.value || null })}>
                            <option value="">Any</option>
                            {colorways.map((colorway) => <option key={colorway} value={colorway}>{colorway}</option>)}
                          </Select>
                        )}
                      </Field>
                      <Field label="Position">
                        {({ id }) => (
                          <Input id={id} type="number" min={1} value={image.position} className="t-spec"
                            onChange={(event) => patchImage(index, { position: Math.max(1, Math.round(Number(event.target.value) || 1)) })} />
                        )}
                      </Field>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <RowActions onRemove={() => drop(setImages)(index)} label={`Remove image ${index + 1}`} />
                  </div>
                </div>
              ))}
              {images.length === 0 ? (
                <p className="t-body-sm border border-dashed border-[var(--border)] px-4 py-10 text-center text-[var(--fg-muted)]">
                  No images yet. A product needs at least one.
                </p>
              ) : null}
            </div>

            <datalist id="vayro-media">
              {MEDIA_PLATES.map((path) => <option key={path} value={path} />)}
            </datalist>

            <AddRow onClick={() => setImages((rows) => [...rows, {
              url: MEDIA_PLATES[0]!, alt: '', kind: 'technical', colorway: null, position: rows.length + 1,
            }])}>
              Add image
            </AddRow>
            {error(state, 'images') ? (
              <p role="alert" className="t-caption mt-3 text-[var(--danger)]">{error(state, 'images')}</p>
            ) : null}

            <h3 className="t-label mt-12 mb-4 text-[var(--fg-muted)]">3D models</h3>
            <div className="flex flex-col gap-4">
              {models.map((model, index) => (
                <div key={`${model.id ?? 'new'}-${index}`} className="grid gap-4 border border-[var(--border)] p-4 sm:grid-cols-[1fr_9rem_11rem_auto]">
                  <Field label="Model URL">
                    {({ id }) => (
                      <Input id={id} value={model.url} className="t-spec" placeholder="/models/meridian-shell.glb"
                        onChange={(event) => patchModel(index, { url: event.target.value })} />
                    )}
                  </Field>
                  <Field label="Format">
                    {({ id }) => (
                      <Select id={id} value={model.format}
                        onChange={(event) => patchModel(index, { format: event.target.value as ModelRow['format'] })}>
                        <option value="glb">glb</option>
                        <option value="gltf">gltf</option>
                      </Select>
                    )}
                  </Field>
                  <Field label="Viewer mode">
                    {({ id }) => (
                      <Select id={id} value={model.mode}
                        onChange={(event) => patchModel(index, { mode: event.target.value as ModelRow['mode'] })}>
                        {MODEL_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                      </Select>
                    )}
                  </Field>
                  <div className="flex items-end justify-between gap-3 pb-2">
                    <Checkbox
                      checked={model.placeholder}
                      onChange={(event) => patchModel(index, { placeholder: event.target.checked })}
                      label="Placeholder"
                    />
                    <RowActions onRemove={() => drop(setModels)(index)} label={`Remove model ${index + 1}`} />
                  </div>
                </div>
              ))}
            </div>
            <AddRow onClick={() => setModels((rows) => [...rows, { url: '', format: 'glb', mode: 'default', placeholder: true }])}>
              Add model
            </AddRow>
          </section>

          {/* ------------------------------------------------ 05 specs etc */}
          <section className="pt-14">
            <SectionHead
              index="05"
              title="Specifications and features"
              description="The technical record. This is the source of truth every claim on the storefront is checked against — if it is not here, it cannot be said elsewhere."
            />

            <div className="w-full overflow-x-auto" tabIndex={0} role="group" aria-label="Specifications">
              <table className="w-full min-w-[40rem] text-left">
                <caption className="sr-only">Specifications</caption>
                <thead className="border-b border-[var(--border)]">
                  <tr>
                    {['Label', 'Value', 'Group', ''].map((heading) => (
                      <th key={heading} scope="col" className="t-label-sm px-2 py-3 font-medium text-[var(--fg-subtle)]">{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {specs.map((spec, index) => (
                    <tr key={index}>
                      <td className="px-2 py-2 w-[14rem]">
                        <Input aria-label={`Specification label ${index + 1}`} value={spec.label} className={cellInput}
                          onChange={(event) => patchSpec(index, { label: event.target.value })} />
                      </td>
                      <td className="px-2 py-2">
                        <Input aria-label={`Specification value ${index + 1}`} value={spec.value} className={cn(cellInput, 't-spec')}
                          onChange={(event) => patchSpec(index, { value: event.target.value })} />
                      </td>
                      <td className="px-2 py-2 w-[11rem]">
                        <Select aria-label={`Specification group ${index + 1}`} value={spec.group} className={cellInput}
                          onChange={(event) => patchSpec(index, { group: event.target.value as SpecRow['group'] })}>
                          {SPEC_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                        </Select>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <RowActions onRemove={() => drop(setSpecs)(index)} label={`Remove specification ${index + 1}`} />
                      </td>
                    </tr>
                  ))}
                  {specs.length === 0 ? (
                    <tr><td colSpan={4} className="px-2 py-10 text-center"><p className="t-body-sm text-[var(--fg-muted)]">No specifications yet.</p></td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
            <AddRow onClick={() => setSpecs((rows) => [...rows, { label: '', value: '', group: 'materials' }])}>
              Add specification
            </AddRow>

            <h3 className="t-label mt-12 mb-4 text-[var(--fg-muted)]">Feature blocks</h3>
            <div className="flex flex-col gap-4">
              {features.map((feature, index) => (
                <div key={index} className="grid gap-4 border border-[var(--border)] p-4 sm:grid-cols-[14rem_1fr_9rem_auto]">
                  <Field label="Title">
                    {({ id }) => <Input id={id} value={feature.title} onChange={(event) => patchFeature(index, { title: event.target.value })} />}
                  </Field>
                  <Field label="Body">
                    {({ id }) => <Input id={id} value={feature.body} onChange={(event) => patchFeature(index, { body: event.target.value })} />}
                  </Field>
                  <Field label="Icon key">
                    {({ id }) => <Input id={id} value={feature.icon} className="t-spec" onChange={(event) => patchFeature(index, { icon: event.target.value })} />}
                  </Field>
                  <div className="flex items-end pb-2">
                    <RowActions onRemove={() => drop(setFeatures)(index)} label={`Remove feature ${index + 1}`} />
                  </div>
                </div>
              ))}
            </div>
            <AddRow onClick={() => setFeatures((rows) => [...rows, { title: '', body: '', icon: 'layers' }])}>
              Add feature
            </AddRow>
          </section>

          {/* ------------------------------------------------- 06 hotspots */}
          <section className="pt-14">
            <SectionHead
              index="06"
              title="Hotspots"
              description="Annotations pinned to the flat product image. Coordinates are normalised: 0 is the left or top edge, 1 the right or bottom."
            />
            <div className="flex flex-col gap-4">
              {hotspots.map((hotspot, index) => (
                <div key={`${hotspot.id ?? 'new'}-${index}`} className="grid gap-4 border border-[var(--border)] p-4 sm:grid-cols-[13rem_1fr_6rem_6rem_auto]">
                  <Field label="Title">
                    {({ id }) => <Input id={id} value={hotspot.title} onChange={(event) => patchHotspot(index, { title: event.target.value })} />}
                  </Field>
                  <Field label="Body">
                    {({ id }) => <Input id={id} value={hotspot.body} onChange={(event) => patchHotspot(index, { body: event.target.value })} />}
                  </Field>
                  <Field label="x">
                    {({ id }) => (
                      <Input id={id} type="number" min={0} max={1} step="0.01" value={hotspot.x} className="t-spec"
                        onChange={(event) => patchHotspot(index, { x: Number(event.target.value) })} />
                    )}
                  </Field>
                  <Field label="y">
                    {({ id }) => (
                      <Input id={id} type="number" min={0} max={1} step="0.01" value={hotspot.y} className="t-spec"
                        onChange={(event) => patchHotspot(index, { y: Number(event.target.value) })} />
                    )}
                  </Field>
                  <div className="flex items-end pb-2">
                    <RowActions onRemove={() => drop(setHotspots)(index)} label={`Remove hotspot ${index + 1}`} />
                  </div>
                </div>
              ))}
            </div>
            <AddRow onClick={() => setHotspots((rows) => [...rows, { title: '', body: '', x: 0.5, y: 0.5 }])}>
              Add hotspot
            </AddRow>
          </section>

          <FormBar state={state}>
            {product ? (
              <ButtonLink href={`/products/${effectiveSlug}`} variant="ghost" size="sm" target="_blank" rel="noreferrer">
                Preview
              </ButtonLink>
            ) : null}
            <ButtonLink href="/admin/products" variant="ghost" size="sm">Cancel</ButtonLink>
            <SubmitButton>{product ? 'Save product' : 'Create product'}</SubmitButton>
          </FormBar>

          {demo ? (
            <p className="t-caption mt-4 text-[var(--fg-subtle)]">
              Demo mode: this form validates in full but does not write. Connect Supabase to persist changes.
            </p>
          ) : null}
        </>
      )}
    </ActionForm>
  );
}

/** Compact price display used by the product list. */
export function ProductPrice({ product }: { product: AdminProduct }) {
  return (
    <span className="t-spec">
      {formatPrice(product.price, product.currency)}
      {product.compareAtPrice ? (
        <span className="ml-2 text-[var(--fg-subtle)] line-through">
          {formatPrice(product.compareAtPrice, product.currency)}
        </span>
      ) : null}
    </span>
  );
}
