"use client";

import { useId, useState } from "react";
import { getDefaultVariant, type Product } from "@/types/product";

export default function ProductInformation({ product }: { product: Product }) {
  const [selectedVariantId, setSelectedVariantId] = useState(() => getDefaultVariant(product)?.id);
  const [quantity, setQuantity] = useState(1);
  const selectId = useId();
  const selectedVariant = product.variants?.find((variant) => variant.id === selectedVariantId);
  // Never inherit optional product-level values for a variant that omits them.
  const configuration = selectedVariant ?? product;
  const productCode = selectedVariant ? selectedVariant.productCode : product.productCode ?? product.sku;
  const hasOptions = (product.variants?.length ?? 0) > 1;
  const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <section className="min-w-0">
      <p className="text-sm font-bold uppercase tracking-wider text-primary">{product.category}</p>
      <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">{product.title}</h1>
      <div aria-live="polite" aria-atomic="true" className="mt-3 space-y-2">
        {productCode && <p className="break-words font-mono text-sm text-muted">Product Code: {productCode}</p>}
        <p className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold text-accent">{configuration.price}</span>
          <span className="text-sm text-muted">(Inc. VAT)</span>
        </p>
        {configuration.unitPrice && <p className="text-muted">{configuration.unitPrice}</p>}
        {configuration.priceExVat && <p className="text-sm text-muted">Excl. VAT: {configuration.priceExVat}</p>}
        {configuration.available === false && <p className="font-medium text-muted">Currently unavailable</p>}
      </div>

      {hasOptions && (
        <div className="mt-6">
          <label htmlFor={selectId} className="mb-2 block text-sm font-semibold">Pack Size</label>
          <select id={selectId} value={selectedVariantId} onChange={(event) => setSelectedVariantId(event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            {product.variants?.map((variant) => (
              <option key={variant.id} value={variant.id}>{variant.title}{variant.available === false ? " — Unavailable" : ""}</option>
            ))}
          </select>
        </div>
      )}

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">Quantity</legend>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className={controlClass}>−</button>
          <output aria-live="polite" aria-label="Purchase quantity" className="min-w-8 text-center font-semibold tabular-nums">{quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className={controlClass}>+</button>
        </div>
        {selectedVariant && <p className="mt-2 text-sm text-muted">Quantity is the number of packs.</p>}
      </fieldset>

      <button type="button" disabled className="mt-6 min-h-12 w-full cursor-not-allowed rounded-xl bg-surface-muted px-6 py-3 font-bold text-muted">Add to Cart</button>
      <p className="mt-2 text-sm text-muted">Cart functionality is coming soon.</p>
      <hr className="my-6 border-border" />
      <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted">Overview</h2>
      <p className="text-lg leading-relaxed text-muted">{product.description}</p>
    </section>
  );
}
