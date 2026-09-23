"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import { useCart } from "@/components/CartProvider";
import { startNavigationProgress } from "@/components/RouteLoadingSignal";
import {
  SIMPLE_TIER_STEPS,
  discountedUnitMinor,
  evaluateBulkOrder,
  getBulkDiscountRate,
  getInventoryLimit,
  minorToMoney,
  moneyToMinor,
  parsePackSize,
  type BulkOrderModel,
} from "@/lib/shopify/bulk-order";
import { formatMoney, formatUkPriceExcludingVat } from "@/lib/shopify/pricing";
import type { ProductVariant } from "@/types/product";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const cellButtonClass = `min-h-16 w-full rounded-lg border border-transparent bg-surface p-3 text-left transition hover:border-primary hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-45 ${focusClass}`;

function normalizedQuantity(value: string): number {
  const quantity = Number.parseInt(value, 10);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 0;
}

function variantIsSelectable(variant: ProductVariant | null): variant is ProductVariant {
  return Boolean(variant?.money && variant.available !== false && getInventoryLimit(variant) !== 0);
}

function QuantityControl({
  label,
  value,
  step,
  error,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  error?: string;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  const errorId = useId();
  return <div>
    <div className={`inline-flex min-h-11 overflow-hidden rounded-lg border bg-surface ${error ? "border-red-500 ring-1 ring-red-500" : "border-border"}`}>
      <button type="button" disabled={disabled || value === 0} aria-label={`Decrease ${label} quantity`} onClick={() => onChange(Math.max(0, value - step))} className={`min-h-11 min-w-11 bg-surface-muted text-xl disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}>−</button>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        aria-label={`${label} quantity`}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(normalizedQuantity(event.target.value))}
        className="w-16 border-x border-border bg-surface text-center font-semibold tabular-nums text-foreground outline-none disabled:opacity-40"
      />
      <button type="button" disabled={disabled} aria-label={`Increase ${label} quantity`} onClick={() => onChange(value + step)} className={`min-h-11 min-w-11 bg-surface-muted text-xl disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}>+</button>
    </div>
    {error && <p id={errorId} className="mt-2 max-w-xs text-xs text-red-600 dark:text-red-400">{error}</p>}
  </div>;
}

function MatrixPrice({ variant, packLabel }: { variant: ProductVariant; packLabel: string }) {
  const packSize = parsePackSize(packLabel);
  const unitMinor = Math.round(moneyToMinor(variant.money!) / packSize);
  return <>
    <span className="block font-semibold text-foreground">{formatMoney(variant.money!)}</span>
    <span className="mt-1 block text-xs text-muted">{formatMoney(minorToMoney(unitMinor, variant.money!.currencyCode))} each</span>
  </>;
}

function MatrixTable({
  model,
  quantities,
  errors,
  onQuantityChange,
}: {
  model: BulkOrderModel;
  quantities: Record<string, number>;
  errors: Map<string, string>;
  onQuantityChange: (key: string, value: number) => void;
}) {
  return <table className="w-full min-w-[44rem] border-collapse text-sm">
    <thead>
      <tr className="bg-surface-muted text-left">
        <th scope="col" className="border border-border px-4 py-3 font-bold">{model.rowOptionName}</th>
        {model.columnValues.map((value) => <th scope="col" key={value} className="border border-border px-4 py-3 font-bold">{value}</th>)}
        <th scope="col" className="border border-border px-4 py-3 font-bold">Quantity</th>
      </tr>
    </thead>
    <tbody>
      {model.rows.map((row) => {
        const availablePackSizes = row.cells.filter((cell) => variantIsSelectable(cell.variant)).map((cell) => parsePackSize(cell.columnValue));
        const step = availablePackSizes.length ? Math.min(...availablePackSizes) : 1;
        const value = quantities[row.key] ?? 0;
        return <tr key={row.key} className="bg-surface">
          <th scope="row" className="border border-border px-4 py-4 text-left font-semibold">{row.label}</th>
          {row.cells.map((cell) => {
            const selectable = variantIsSelectable(cell.variant);
            return <td key={cell.columnValue} className="border border-border p-2 align-middle">
              {cell.variant ? <button
                type="button"
                disabled={!selectable}
                onClick={() => onQuantityChange(row.key, value + parsePackSize(cell.columnValue))}
                aria-label={`Add ${cell.columnValue} to ${row.label} desired quantity`}
                className={cellButtonClass}
              >
                {cell.variant.money ? <MatrixPrice variant={cell.variant} packLabel={cell.columnValue} /> : <span className="text-muted">Unavailable</span>}
                {!selectable && <span className="mt-1 block text-xs text-muted">Unavailable</span>}
              </button> : <span aria-label={`${row.label}, ${cell.columnValue} unavailable`} className="block px-3 text-center text-muted">—</span>}
            </td>;
          })}
          <td className="border border-border px-4 py-4 align-middle">
            <QuantityControl label={row.label} value={value} step={step} error={errors.get(row.key)} disabled={!availablePackSizes.length} onChange={(next) => onQuantityChange(row.key, next)} />
          </td>
        </tr>;
      })}
    </tbody>
  </table>;
}

function VariantMatrixTable({
  model,
  quantities,
  errors,
  discountRate,
  onQuantityChange,
}: {
  model: BulkOrderModel;
  quantities: Record<string, number>;
  errors: Map<string, string>;
  discountRate: number;
  onQuantityChange: (key: string, value: number) => void;
}) {
  return <table className="w-full min-w-[38rem] border-collapse text-sm">
    <thead><tr className="bg-surface-muted text-left">
      <th scope="col" className="border border-border px-4 py-3 font-bold">{model.rowOptionName}</th>
      {model.columnValues.map((value) => <th scope="col" key={value} className="border border-border px-4 py-3 font-bold">{value}</th>)}
    </tr></thead>
    <tbody>{model.rows.map((row) => <tr key={row.key} className="bg-surface">
      <th scope="row" className="border border-border px-4 py-4 text-left font-semibold">{row.label}</th>
      {row.cells.map((cell) => {
        const variant = cell.variant;
        const selected = variant ? quantities[variant.id] ?? 0 : 0;
        const limit = variant ? getInventoryLimit(variant) : 0;
        const disabled = !variantIsSelectable(variant) || (limit !== null && selected >= limit);
        return <td key={cell.columnValue} className="border border-border p-2 align-middle">
          {variant?.money ? <button type="button" disabled={disabled} onClick={() => onQuantityChange(variant.id, selected + 1)} aria-label={`Add one ${row.label}, ${cell.columnValue}`} className={cellButtonClass}>
            <span className="block font-semibold">{formatMoney(minorToMoney(discountedUnitMinor(moneyToMinor(variant.money), discountRate), variant.money.currencyCode))}</span>
            <span className="mt-1 block text-xs text-muted">each</span>
            {selected > 0 && <span className="mt-2 block text-xs font-semibold text-primary">{selected} selected</span>}
            {errors.get(variant.id) && <span className="mt-2 block text-xs text-red-600 dark:text-red-400">{errors.get(variant.id)}</span>}
          </button> : <span aria-label={`${row.label}, ${cell.columnValue} unavailable`} className="block px-3 text-center text-muted">—</span>}
        </td>;
      })}
    </tr>)}</tbody>
  </table>;
}

function SimpleTable({
  model,
  quantities,
  errors,
  onQuantityChange,
}: {
  model: BulkOrderModel;
  quantities: Record<string, number>;
  errors: Map<string, string>;
  onQuantityChange: (key: string, value: number) => void;
}) {
  const tierLabels = ["1–9 pack(s)", "10–19 packs", "20+ packs"];
  return <table className="w-full min-w-[48rem] border-collapse text-sm">
    <thead><tr className="bg-surface-muted text-left">
      <th scope="col" className="border border-border px-4 py-3 font-bold">Variant</th>
      {tierLabels.map((label) => <th scope="col" key={label} className="border border-border px-4 py-3 font-bold">{label}</th>)}
      <th scope="col" className="border border-border px-4 py-3 font-bold">Order</th>
    </tr></thead>
    <tbody>{model.rows.map((row) => {
      const variant = row.cells[0].variant!;
      const value = quantities[variant.id] ?? 0;
      const limit = getInventoryLimit(variant);
      const selectable = variantIsSelectable(variant);
      return <tr key={variant.id} className="bg-surface">
        <th scope="row" className="border border-border px-4 py-4 text-left font-semibold">{row.label}</th>
        {SIMPLE_TIER_STEPS.map((step) => {
          const rate = getBulkDiscountRate(step);
          const disabled = !selectable || (limit !== null && value + step > limit);
          return <td key={step} className="border border-border p-2">
            <button type="button" disabled={disabled} onClick={() => onQuantityChange(variant.id, value + step)} aria-label={`Add ${step} ${row.label}`} className={cellButtonClass}>
              {variant.money && <span className="font-semibold">{formatMoney(minorToMoney(discountedUnitMinor(moneyToMinor(variant.money), rate), variant.money.currencyCode))}</span>}
              <span className="mt-1 block text-xs text-muted">each</span>
            </button>
          </td>;
        })}
        <td className="border border-border px-4 py-4">
          <QuantityControl label={row.label} value={value} step={1} error={errors.get(variant.id)} disabled={!selectable} onChange={(next) => onQuantityChange(variant.id, next)} />
        </td>
      </tr>;
    })}</tbody>
  </table>;
}

export default function BulkVariantOrderTable({ model }: { model: BulkOrderModel | null }) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState<"add" | "checkout" | null>(null);
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [checkoutLinesFingerprint, setCheckoutLinesFingerprint] = useState<string | null>(null);
  const messageId = useId();
  const { addLines, openDrawer, prepareCheckout, loading: cartLoading } = useCart();
  const evaluation = useMemo(() => model ? evaluateBulkOrder(model, quantities) : null, [model, quantities]);
  const showSummary = Boolean(evaluation && (evaluation.selectedQuantity > 0 || evaluation.errors.length > 0));

  useEffect(() => {
    document.body.classList.toggle("bulk-order-summary-visible", showSummary);
    return () => document.body.classList.remove("bulk-order-summary-visible");
  }, [showSummary]);

  if (!model || !evaluation) return null;

  const result = evaluation;
  const errors = new Map(result.errors.map((error) => [error.key, error.message]));
  const hasSelection = result.selectedQuantity > 0;
  const hasErrors = result.errors.length > 0;
  const linesFingerprint = JSON.stringify(result.lines);
  const incVat = minorToMoney(result.totalMinor, result.currencyCode);
  const exVat = formatUkPriceExcludingVat(incVat);
  const busy = submitting !== null || cartLoading;

  function changeQuantity(key: string, value: number) {
    setQuantities((current) => ({ ...current, [key]: Math.max(0, Math.trunc(value)) }));
    setCheckoutLinesFingerprint(null);
    setMessage(null);
  }

  function clearSelection() {
    setQuantities({});
    setCheckoutLinesFingerprint(null);
    setMessage(null);
  }

  async function handleAdd() {
    if (!hasSelection || hasErrors || result.lines.length === 0 || busy) return;
    setSubmitting("add");
    setMessage(null);
    try {
      if (checkoutLinesFingerprint === linesFingerprint) {
        openDrawer();
      } else {
        await addLines(result.lines);
      }
      setQuantities({});
      setCheckoutLinesFingerprint(null);
      setMessage({ kind: "success", text: "Selected products were added to your cart." });
    } catch (reason) {
      setMessage({ kind: "error", text: reason instanceof Error ? reason.message : "Some items could not be added. Please check stock and try again." });
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCheckout() {
    if (!hasSelection || hasErrors || result.lines.length === 0 || busy) return;
    setSubmitting("checkout");
    setMessage(null);
    try {
      if (checkoutLinesFingerprint !== linesFingerprint) {
        await addLines(result.lines, { openDrawer: false });
        setCheckoutLinesFingerprint(linesFingerprint);
      }
      const checkoutUrl = await prepareCheckout();
      flushSync(() => startNavigationProgress());
      window.location.assign(checkoutUrl);
    } catch (reason) {
      setMessage({ kind: "error", text: reason instanceof Error ? reason.message : "Checkout is temporarily unavailable. Please try again." });
    } finally {
      setSubmitting(null);
    }
  }

  return <section className="mt-12" aria-labelledby="bulk-order-title">
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-6">
      <header className="mb-5">
        <p className="text-sm font-bold uppercase tracking-wider text-primary">Fast multi-variant ordering</p>
        <h2 id="bulk-order-title" className="mt-1 text-2xl font-bold">Bulk order</h2>
        <p className="mt-2 text-sm text-muted">Select the quantities you need and add every chosen variant to your cart in one go.</p>
      </header>
      <div className="max-w-full overflow-x-auto overscroll-x-contain rounded-xl border border-border">
        {(model.mode === "matrix" || model.mode === "quantity_only") && <MatrixTable model={model} quantities={quantities} errors={errors} onQuantityChange={changeQuantity} />}
        {model.mode === "variant_matrix" && <VariantMatrixTable model={model} quantities={quantities} errors={errors} discountRate={result.discountRate} onQuantityChange={changeQuantity} />}
        {model.mode === "simple" && <SimpleTable model={model} quantities={quantities} errors={errors} onQuantityChange={changeQuantity} />}
      </div>
      {result.discountRate > 0 && <p className="mt-3 text-xs text-muted">Estimated bulk discount: {Math.round(result.discountRate * 100)}%. Shopify cart and checkout totals remain authoritative.</p>}
      <div id={messageId} aria-live="polite" aria-atomic="true" className="mt-4 min-h-5 text-sm">
        {message && <p className={message.kind === "error" ? "text-red-600 dark:text-red-400" : "text-primary"}>{message.text}</p>}
        {!message && hasErrors && <p className="text-red-600 dark:text-red-400">{result.errors[0].message}</p>}
      </div>
    </div>

    {(hasSelection || hasErrors) && <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 shadow-[0_-10px_30px_rgba(0,0,0,0.18)] backdrop-blur supports-[padding:max(0px)]:pb-[env(safe-area-inset-bottom)]">
      <div className="site-container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm sm:text-base" aria-live="polite">
          <span><strong className="text-lg">{result.selectedQuantity}</strong> selected</span>
          <span><strong>Inc. VAT:</strong> {formatMoney(incVat)}</span>
          {exVat && <span><strong>Excl. VAT:</strong> {exVat}</span>}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <button type="button" disabled={busy} onClick={clearSelection} className={`min-h-12 rounded-xl border border-red-500 px-4 font-semibold text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400 ${focusClass}`}>Clear All</button>
          <button type="button" disabled={!hasSelection || hasErrors || busy} aria-describedby={messageId} onClick={() => void handleCheckout()} className={`min-h-12 rounded-xl border border-border bg-surface px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}>{submitting === "checkout" ? "Preparing…" : "Checkout"}</button>
          <button type="button" disabled={!hasSelection || hasErrors || busy} aria-describedby={messageId} onClick={() => void handleAdd()} className={`col-span-2 min-h-12 rounded-xl bg-primary px-5 font-bold text-primary-foreground disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted sm:col-span-1 ${focusClass}`}>{submitting === "add" ? "Adding…" : "Add to cart"}</button>
        </div>
      </div>
    </div>}
  </section>;
}
