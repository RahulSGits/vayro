'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import type { AdminJournalPost, AdminProduct } from '@/app/admin/_data/queries';
import { deleteJournalPost, saveJournalPost, setProductFeatured } from '@/app/admin/actions';
import { ActionButtonForm, ActionForm, ActionMessage, FieldGrid, SubmitButton } from './Form';
import { Panel } from './Chrome';

/* ==========================================================================
   Content operations: the journal, the featured set, and the homepage copy.
   The journal editor opens in place rather than on its own route — an editor
   moving between six posts should never lose the list behind it.
   ========================================================================== */

const JOURNAL_CATEGORIES = [
  'Field Notes', 'Product Innovation', 'Material Science', 'Travel', 'Outdoor Culture',
];

const HERO_PLATES = [
  'field-ridgeline', 'field-dusk', 'field-highpass', 'field-coastal', 'field-transit',
  'field-ascent', 'field-treeline', 'material-ripstop', 'material-twill', 'material-shell',
].map((name) => `/media/${name}.webp`);

function JournalEditor({ post, onDone }: { post: AdminJournalPost | null; onDone: () => void }) {
  return (
    <ActionForm action={saveJournalPost}>
      {(state) => (
        <>
          {post ? <input type="hidden" name="id" value={post.id} /> : null}

          <FieldGrid>
            <Field label="Title" required error={state.fieldErrors?.title}>
              {({ id, invalid }) => (
                <Input id={id} name="title" required defaultValue={post?.title ?? ''} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Slug" hint="Leave blank to derive from the title." error={state.fieldErrors?.slug}>
              {({ id, describedBy, invalid }) => (
                <Input id={id} name="slug" defaultValue={post?.slug ?? ''} className="t-spec"
                  aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Category" required>
              {({ id }) => (
                <Select id={id} name="category" defaultValue={post?.category ?? JOURNAL_CATEGORIES[0]}>
                  {JOURNAL_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </Select>
              )}
            </Field>
            <Field label="Author" required>
              {({ id }) => <Input id={id} name="author" required defaultValue={post?.author ?? 'VAYRO Studio'} />}
            </Field>
            <Field label="Reading minutes" required error={state.fieldErrors?.readingMinutes}>
              {({ id, invalid }) => (
                <Input id={id} name="readingMinutes" type="number" min={1} max={90} required
                  defaultValue={post?.readingMinutes ?? 3} className="t-spec" aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Hero image">
              {({ id }) => (
                <Input id={id} name="heroImage" list="vayro-journal-media" className="t-spec"
                  defaultValue={post?.heroImage ?? ''} placeholder="/media/field-ridgeline.webp" />
              )}
            </Field>
          </FieldGrid>

          <datalist id="vayro-journal-media">
            {HERO_PLATES.map((path) => <option key={path} value={path} />)}
          </datalist>

          <div className="mt-7 flex flex-col gap-7">
            <Field label="Excerpt" required hint="One sentence. It carries the card on the index." error={state.fieldErrors?.excerpt}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="excerpt" rows={2} required maxLength={300}
                  defaultValue={post?.excerpt ?? ''} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Field label="Body" required hint="Blank lines separate paragraphs." error={state.fieldErrors?.body}>
              {({ id, describedBy, invalid }) => (
                <Textarea id={id} name="body" rows={14} required
                  defaultValue={post?.body ?? ''} aria-describedby={describedBy} aria-invalid={invalid} />
              )}
            </Field>
            <Checkbox name="published" defaultChecked={Boolean(post?.publishedAt)} label="Published — visible in the journal" />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border)] pt-5">
            <ActionMessage state={state} />
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={onDone}>Close</Button>
              <SubmitButton>{post ? 'Save post' : 'Create post'}</SubmitButton>
            </div>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function JournalManager({ posts }: { posts: AdminJournalPost[] }) {
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  return (
    <Panel
      title="Journal"
      description="Long-form editorial. A draft is invisible to the storefront until it is published."
      actions={
        <Button
          type="button"
          variant={editing === 'new' ? 'ghost' : 'secondary'}
          size="xs"
          onClick={() => setEditing(editing === 'new' ? null : 'new')}
        >
          {editing === 'new' ? 'Cancel' : 'New post'}
        </Button>
      }
    >
      <ul className="divide-y divide-[var(--border)]">
        {posts.map((post) => {
          const isOpen = editing === post.id;
          return (
            <li key={post.id} className="py-4 first:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-3">
                    <span className="font-medium">{post.title}</span>
                    <Badge tone={post.publishedAt ? 'muted' : 'warning'}>
                      {post.publishedAt ? 'Published' : 'Draft'}
                    </Badge>
                  </p>
                  <p className="t-caption mt-1.5 text-[var(--fg-subtle)]">
                    {post.category} · {post.readingMinutes} min ·{' '}
                    {post.publishedAt ? formatDate(post.publishedAt) : 'not published'}
                    {' · '}
                    <span className="t-spec">/{post.slug}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {post.publishedAt ? (
                    <Link
                      href={`/journal/${post.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="t-label-sm px-2 py-2 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
                    >
                      View
                    </Link>
                  ) : null}
                  <Button
                    type="button"
                    variant={isOpen ? 'ghost' : 'secondary'}
                    size="xs"
                    onClick={() => setEditing(isOpen ? null : post.id)}
                    aria-expanded={isOpen}
                  >
                    {isOpen ? 'Close' : 'Edit'}
                  </Button>
                  <ActionButtonForm
                    action={deleteJournalPost}
                    fields={{ id: post.id }}
                    variant="ghost"
                    size="xs"
                    confirm={`Delete “${post.title}”? This cannot be undone.`}
                  >
                    Delete
                  </ActionButtonForm>
                </div>
              </div>

              {isOpen ? (
                <div className="mt-6 border-t border-[var(--border)] pt-6">
                  <JournalEditor post={post} onDone={() => setEditing(null)} />
                </div>
              ) : null}
            </li>
          );
        })}
        {posts.length === 0 ? (
          <li className="py-10 text-center">
            <p className="t-body-sm text-[var(--fg-muted)]">No journal posts yet.</p>
          </li>
        ) : null}
      </ul>

      {editing === 'new' ? (
        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <h3 className="t-label mb-6 text-[var(--fg-muted)]">New post</h3>
          <JournalEditor post={null} onDone={() => setEditing(null)} />
        </div>
      ) : null}
    </Panel>
  );
}

export function FeaturedProducts({ products }: { products: AdminProduct[] }) {
  const featured = products.filter((product) => product.featured);

  return (
    <Panel
      title="Featured products"
      description="Featured pieces carry the homepage and the editorial modules. Keep the set small — three or four reads as a selection, ten reads as a catalogue."
      footer={
        <p className="t-spec text-[var(--fg-subtle)]">
          {featured.length} of {products.length} featured
        </p>
      }
    >
      <ul className="divide-y divide-[var(--border)]">
        {products.map((product) => (
          <li key={product.id} className="flex flex-wrap items-center justify-between gap-4 py-3.5 first:pt-0">
            <div className="min-w-0">
              <Link
                href={`/admin/products/${product.id}`}
                className="block truncate font-medium underline decoration-transparent underline-offset-[5px] transition-[text-decoration-color] duration-[var(--d-fast)] hover:decoration-[var(--border-strong)]"
              >
                {product.name}
              </Link>
              <p className="t-caption mt-1 text-[var(--fg-subtle)]">
                {product.categorySlug} · {product.status}
              </p>
            </div>
            <ActionButtonForm
              action={setProductFeatured}
              fields={{ id: product.id, featured: String(!product.featured) }}
              variant={product.featured ? 'primary' : 'secondary'}
              size="xs"
            >
              {product.featured ? 'Featured' : 'Feature'}
            </ActionButtonForm>
          </li>
        ))}
        {products.length === 0 ? (
          <li className="py-10 text-center"><p className="t-body-sm text-[var(--fg-muted)]">No products yet.</p></li>
        ) : null}
      </ul>
    </Panel>
  );
}
