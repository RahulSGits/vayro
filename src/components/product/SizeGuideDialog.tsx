'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { Dialog } from '@/components/ui/Dialog';
import { hasSizeChart, sizeRowsFor, specValue } from './product-utils';

/* ==========================================================================
   SizeGuideDialog — the fit reference.

   Body measurements, not garment measurements: the numbers describe who the
   piece is cut for. Garment weight and packed dimensions stay in the
   specification table, where they can be checked against the product.
   ========================================================================== */

const COLUMNS = [
  { key: 'size', label: 'Size' },
  { key: 'chest', label: 'Chest' },
  { key: 'waist', label: 'Waist' },
  { key: 'length', label: 'Back length' },
  { key: 'sleeve', label: 'Sleeve' },
] as const;

export function SizeGuideDialog({ product, className }: { product: Product; className?: string }) {
  const [open, setOpen] = useState(false);
  const rows = sizeRowsFor(product);
  const charted = hasSizeChart(product);
  const weight = specValue(product, 'Weight (size M)') ?? specValue(product, 'Weight');

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-cursor="link"
        className={cn(
          't-label-sm text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]',
          className,
        )}
      >
        Size guide
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Size guide"
        description={`${product.name} — how the piece is cut.`}
        size="lg"
      >
        {charted ? (
          <>
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full min-w-[30rem] border-collapse px-2">
                <caption className="sr-only">
                  Body measurements in centimetres for {product.name}
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-strong)]">
                    {COLUMNS.map((column) => (
                      <th
                        key={column.key}
                        scope="col"
                        className="t-label-sm px-2 py-3 text-left text-[var(--fg-subtle)]"
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.size} className="border-b border-[var(--border)]">
                      <th scope="row" className="t-label px-2 py-3 text-left">
                        {row.size}
                      </th>
                      <td className="t-spec px-2 py-3 text-[var(--fg-muted)]">{row.chest}</td>
                      <td className="t-spec px-2 py-3 text-[var(--fg-muted)]">{row.waist}</td>
                      <td className="t-spec px-2 py-3 text-[var(--fg-muted)]">{row.length}</td>
                      <td className="t-spec px-2 py-3 text-[var(--fg-muted)]">{row.sleeve}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-3 border-t border-[var(--border)] pt-6">
              <p className="t-body-sm text-[var(--fg-muted)]">
                Body measurements in centimetres. Between sizes, take the larger — this piece is cut
                to layer over a mid.
              </p>
              {weight ? (
                <p className="t-spec text-[var(--fg-subtle)]">Garment weight — {weight}</p>
              ) : null}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <p className="t-body-lg">One size.</p>
            <p className="t-body-sm text-[var(--fg-muted)]">
              This piece is made in a single size. Dimensions and weight are listed in the
              specification table on this page.
            </p>
          </div>
        )}
      </Dialog>
    </>
  );
}
