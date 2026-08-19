'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { cn, formatPrice } from '@/lib/utils';
import type { InventoryRow } from '@/app/admin/_data/queries';
import { idleState, type ActionState } from '@/app/admin/_data/action-state';
import { updateStock } from '@/app/admin/actions';
import { StockPill } from './StatusPill';
import { SubmitButton } from './Form';
import { EmptyRow, Swatch, TBody, TD, TH, THead, TR, Table, TableScroller } from './Table';

/* ==========================================================================
   Inventory.
   Each row is its own form, so a stock correction is one focused write rather
   than a page-wide save. The Save control only appears once a row is dirty —
   the table stays quiet until something actually changes.
   ========================================================================== */

const stepper =
  'h-9 w-8 shrink-0 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] disabled:opacity-40';

function StockRow({ row }: { row: InventoryRow }) {
  const [state, formAction] = useActionState(updateStock, idleState);
  const [stock, setStock] = useState(String(row.stock));
  const [threshold, setThreshold] = useState(String(row.lowStockThreshold));
  const { toast } = useToast();

  const announced = useRef<ActionState>(state);

  useEffect(() => {
    if (state.status === 'idle' || announced.current === state) return;
    announced.current = state;
    toast({
      title: state.status === 'success' ? `${row.sku} updated` : state.status === 'demo' ? 'Demo mode' : 'Not saved',
      description: state.message,
      tone: state.status === 'success' ? 'success' : state.status === 'demo' ? 'warning' : 'error',
    });
  }, [state, row.sku, toast]);

  const parsedStock = Math.max(0, Number(stock) || 0);
  const parsedThreshold = Math.max(0, Number(threshold) || 0);

  // The saved row is the baseline. A successful write revalidates this segment,
  // the row arrives with the new numbers, and the control quietly stands down.
  const dirty = parsedStock !== row.stock || parsedThreshold !== row.lowStockThreshold;

  const step = (delta: number) => setStock((current) => String(Math.max(0, (Number(current) || 0) + delta)));

  return (
    <TR>
      <TD mono><span className="whitespace-nowrap">{row.sku}</span></TD>

      <TD>
        <Link
          href={`/admin/products/${row.productId}`}
          className="block truncate font-medium text-[var(--fg)] underline decoration-transparent underline-offset-[5px] transition-[text-decoration-color] duration-[var(--d-fast)] hover:decoration-[var(--border-strong)]"
        >
          {row.productName}
        </Link>
        <span className="t-caption mt-1 flex items-center gap-2 text-[var(--fg-subtle)]">
          <Swatch hex={row.colorHex} label={row.colorway} />
          {row.colorway} · {row.size}
        </span>
      </TD>

      <TD><StockPill stock={parsedStock} threshold={parsedThreshold} /></TD>

      <TD align="right">
        <form action={formAction} className="flex items-center justify-end gap-2">
          <input type="hidden" name="variantId" value={row.variantId} />

          <span className="inline-flex items-center border border-[var(--border-strong)]">
            <button type="button" onClick={() => step(-1)} aria-label={`Decrease stock for ${row.sku}`} className={stepper}>
              <span aria-hidden>−</span>
            </button>
            <Input
              name="stock"
              type="number"
              min={0}
              value={stock}
              aria-label={`Stock for ${row.sku}`}
              onChange={(event) => setStock(event.target.value)}
              className="t-spec h-9 w-14 border-none px-0 py-0 text-center"
            />
            <button type="button" onClick={() => step(1)} aria-label={`Increase stock for ${row.sku}`} className={stepper}>
              <span aria-hidden>+</span>
            </button>
          </span>

          <span className="inline-flex items-center border border-[var(--border-strong)]">
            <Input
              name="lowStockThreshold"
              type="number"
              min={0}
              value={threshold}
              aria-label={`Low stock threshold for ${row.sku}`}
              onChange={(event) => setThreshold(event.target.value)}
              className="t-spec h-9 w-14 border-none px-0 py-0 text-center"
            />
          </span>

          <span className={cn('transition-opacity duration-[var(--d-fast)]', dirty ? 'opacity-100' : 'pointer-events-none opacity-0')}>
            <SubmitButton size="xs">Save</SubmitButton>
          </span>
        </form>
      </TD>

      <TD align="right" mono>{formatPrice(parsedStock * row.price, row.currency, { compact: true })}</TD>
    </TR>
  );
}

export function InventoryTable({ rows }: { rows: InventoryRow[] }) {
  return (
    <TableScroller>
      <Table caption="Stock levels by SKU">
        <THead>
          <TH width="9rem">SKU</TH>
          <TH>Product</TH>
          <TH width="9rem">State</TH>
          <TH align="right" width="20rem">Stock · low at</TH>
          <TH align="right" width="9rem">Retail value</TH>
        </THead>
        <TBody>
          {rows.map((row) => <StockRow key={row.variantId} row={row} />)}
          {rows.length === 0 ? <EmptyRow colSpan={5}>No SKUs match this view.</EmptyRow> : null}
        </TBody>
      </Table>
    </TableScroller>
  );
}
