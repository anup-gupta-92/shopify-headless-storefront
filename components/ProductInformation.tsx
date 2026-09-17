"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { getDefaultVariant, type Product } from "@/types/product";
import { useSearchParams } from "next/navigation";
import { resolveVariant, variantUrlId } from "@/lib/product-options";
import { formatMoney } from "@/lib/shopify/pricing";
import { useCart } from "@/components/CartProvider";

export default function ProductInformation({ product }: { product: Product }) {
  const searchParams = useSearchParams();
  const variants = product.variants ?? [];
  const requestedId = searchParams.get("variant");
  const selectedVariant = variants.find((variant) => variantUrlId(variant.id) === requestedId || variant.id === requestedId)
    ?? variants.find((variant) => variant.available !== false) ?? getDefaultVariant(product);
  const selections = Object.fromEntries(selectedVariant?.selectedOptions?.map(({ name, value }) => [name, value]) ?? []);
  const options = (product.options ?? []).filter((option) => !(option.name === "Title" && option.values.length === 1 && option.values[0] === "Default Title"));
  function chooseVariant(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", variantUrlId(id));
    window.history.pushState(null, "", url);
  }
  function chooseOption(name: string, value: string) {
    const exact = resolveVariant(variants, { ...selections, [name]: value });
    // If a combination does not exist, retain the changed dimension and select
    // an available real variant. The other selectors reflect the resolved variant.
    const candidates = variants.filter((variant) => variant.selectedOptions?.some((option) => option.name === name && option.value === value));
    const next = exact ?? candidates.find((variant) => variant.available !== false) ?? candidates[0];
    if (next) chooseVariant(next.id);
  }
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const { addItem, loading: cartLoading } = useCart();
  const selectId = useId();
  // Never inherit optional product-level values for a variant that omits them.
  const configuration = selectedVariant ?? product;
  const productCode = selectedVariant ? selectedVariant.productCode : product.productCode ?? product.sku;
  const hasOptions = (product.variants?.length ?? 0) > 1;
  const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

  async function handleAddToCart() {
    if (!selectedVariant || selectedVariant.available === false || adding || cartLoading) return;
    setAdding(true);
    setCartError(null);
    try {
      await addItem(selectedVariant.id, quantity);
    } catch (reason) {
      setCartError(reason instanceof Error ? reason.message : "Your item could not be added. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section className="min-w-0">
      {product.collections?.length ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-bold uppercase tracking-wider text-primary">
          {product.collections.map((collection, index) => (
            <span key={collection.handle} className="inline-flex items-center gap-x-2">
              {index > 0 && <span aria-hidden="true">•</span>}
              <Link
                href={`/collections/${encodeURIComponent(collection.handle)}`}
                className="rounded underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {collection.title}
              </Link>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-bold uppercase tracking-wider text-primary">{product.category}</p>
      )}
      <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight md:text-4xl lg:text-5xl">{product.title}</h1>
      <div aria-live="polite" aria-atomic="true" className="mt-3 space-y-2">
        {productCode && <p className="break-words font-mono text-sm text-muted">Product Code: {productCode}</p>}
        <p className="mt-4 flex flex-wrap items-baseline gap-2">
          <span className="text-3xl font-bold text-accent">{configuration.price}</span>
          <span className="text-sm text-muted">(Inc. VAT)</span>
        </p>
        {selectedVariant?.compareAtPrice && selectedVariant.money && Number(selectedVariant.compareAtPrice.amount) > Number(selectedVariant.money.amount) && <p className="text-muted"><span className="sr-only">Previous price: </span><del>{formatMoney(selectedVariant.compareAtPrice)}</del></p>}
        {configuration.unitPrice && <p className="text-muted">{configuration.unitPrice}</p>}
        {configuration.priceExVat && <p className="text-sm text-muted">Excl. VAT: {configuration.priceExVat}</p>}
        {configuration.available === false && <p className="font-medium text-muted">Currently unavailable</p>}
      </div>

      {options.map((option, index) => <div key={option.name} className="mt-5">
        <label htmlFor={`${selectId}-${index}`} className="mb-2 block text-sm font-semibold">{option.name}</label>
        <select id={`${selectId}-${index}`} value={selections[option.name] ?? ""} onChange={(event) => chooseOption(option.name, event.target.value)} className="min-h-12 w-full min-w-0 rounded-lg border border-border bg-surface px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {option.values.map((value) => {
            const match = resolveVariant(variants, { ...selections, [option.name]: value });
            const possible = variants.some((variant) => variant.selectedOptions?.some((entry) => entry.name === option.name && entry.value === value));
            return <option key={value} value={value} disabled={!possible}>{value}{match?.available === false ? " — Unavailable" : !match ? " — Other options change" : ""}</option>;
          })}
        </select>
      </div>)}
      {!options.length && hasOptions && <div className="mt-5">
        <label htmlFor={selectId} className="mb-2 block text-sm font-semibold">Options</label>
        <select id={selectId} value={selectedVariant?.id ?? ""} onChange={(event) => chooseVariant(event.target.value)} className="min-h-12 w-full rounded-lg border border-border bg-surface px-3">
          {variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.title}{variant.available === false ? " — Unavailable" : ""}</option>)}
        </select>
      </div>}

      <fieldset className="mt-6">
        <legend className="mb-2 text-sm font-semibold">Quantity</legend>
        <div className="flex items-center gap-3">
          <button type="button" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity((value) => Math.max(1, value - 1))} className={controlClass}>−</button>
          <output aria-live="polite" aria-label="Purchase quantity" className="min-w-8 text-center font-semibold tabular-nums">{quantity}</output>
          <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)} className={controlClass}>+</button>
        </div>
        {selectedVariant && <p className="mt-2 text-sm text-muted">Quantity is the number of the selected item.</p>}
      </fieldset>

      <button
        type="button"
        disabled={!selectedVariant || selectedVariant.available === false || adding || cartLoading}
        aria-describedby={`${selectId}-cart-note`}
        onClick={() => void handleAddToCart()}
        className="mt-6 min-h-12 w-full rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted"
      >{adding ? "Adding…" : "Add to Cart"}</button>
      <p id={`${selectId}-cart-note`} className="mt-2 text-sm text-muted">Adds the selected option and quantity to your Shopify cart.</p>
      {cartError && <p role="alert" className="mt-3 rounded-lg border border-border bg-surface-muted p-3 text-sm text-foreground">{cartError}</p>}
    </section>
  );
}
