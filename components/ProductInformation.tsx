"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { getDefaultVariant, type Product } from "@/types/product";
import { useSearchParams } from "next/navigation";
import { resolveVariant, variantUrlId } from "@/lib/product-options";
import { formatMoney, formatUkPriceExcludingVat, validCompareAtPrice } from "@/lib/shopify/pricing";
import { isQuantityOptionName } from "@/lib/shopify/bulk-order";
import { formatUnitPrice, getBulkUnitPriceDisplay } from "@/lib/shopify/unit-price";
import { selectedSellingPlanAllocation, sellingPlanOptionLabel, sellingPlanSavingsPercent } from "@/lib/shopify/subscriptions";
import { useCart } from "@/components/CartProvider";
import ReviewStars from "@/components/ReviewStars";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import { trackViewItem } from "@/lib/analytics/events";
import ProductDispatchMessage from "@/components/ProductDispatchMessage";

export default function ProductInformation({ product }: { product: Product }) {
  const searchParams = useSearchParams();
  const variants = product.variants ?? [];
  const requestedId = searchParams.get("variant");
  const selectedVariant = variants.find((variant) => variantUrlId(variant.id) === requestedId || variant.id === requestedId)
    ?? variants.find((variant) => variant.available !== false) ?? getDefaultVariant(product);
  const [purchaseSelection, setPurchaseSelection] = useState<{
    variantId: string | undefined;
    type: "one-time" | "subscription";
    sellingPlanId: string | null;
  }>({ variantId: selectedVariant?.id, type: "one-time", sellingPlanId: null });
  const selections = Object.fromEntries(selectedVariant?.selectedOptions?.map(({ name, value }) => [name, value]) ?? []);
  const options = (product.options ?? []).filter((option) => !(option.name === "Title" && option.values.length === 1 && option.values[0] === "Default Title"));
  function chooseVariant(id: string) {
    const nextVariant = variants.find((variant) => variant.id === id);
    const nextAllocations = nextVariant?.sellingPlanAllocations ?? [];
    setPurchaseSelection((current) => {
      if (current.type !== "subscription" || !nextAllocations.length) {
        return { variantId: id, type: "one-time", sellingPlanId: null };
      }
      const compatiblePlan = nextAllocations.find((allocation) =>
        allocation.sellingPlan.id === current.sellingPlanId,
      ) ?? nextAllocations[0];
      return {
        variantId: id,
        type: "subscription",
        sellingPlanId: compatiblePlan.sellingPlan.id,
      };
    });
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
  const { hasConsent } = useCookieConsent();
  const analyticsEnabled = hasConsent("analytics");
  const trackedProductRef = useRef<string | null>(null);
  const selectId = useId();
  // Never inherit optional product-level values for a variant that omits them.
  const configuration = selectedVariant ?? product;
  const sellingPlanAllocations = selectedVariant?.sellingPlanAllocations ?? [];
  const selectionMatchesVariant = purchaseSelection.variantId === selectedVariant?.id;
  const selectedSellingPlan = selectedSellingPlanAllocation(
    sellingPlanAllocations,
    selectionMatchesVariant ? purchaseSelection.sellingPlanId : null,
  );
  const subscriptionSelected = selectionMatchesVariant
    && purchaseSelection.type === "subscription"
    && Boolean(selectedSellingPlan);
  const displayedMoney = subscriptionSelected ? selectedSellingPlan?.price : selectedVariant?.money;
  const packOptionValue = selectedVariant?.selectedOptions?.find(({ name }) =>
    isQuantityOptionName(name),
  )?.value;
  const calculatedUnitPrice = displayedMoney
    ? getBulkUnitPriceDisplay(
        displayedMoney,
        packOptionValue,
        subscriptionSelected ? undefined : selectedVariant?.unitPriceMoney,
      )
    : selectedVariant?.unitPriceMoney
      ? formatUnitPrice(selectedVariant.unitPriceMoney)
    : null;
  const unitPrice = calculatedUnitPrice
    ? `${calculatedUnitPrice} / item`
    : configuration.unitPrice;
  const compareAtPrice = subscriptionSelected
    ? validCompareAtPrice(displayedMoney, selectedVariant?.money)
      ?? validCompareAtPrice(displayedMoney, selectedVariant?.compareAtPrice)
    : selectedVariant ? validCompareAtPrice(selectedVariant.money, selectedVariant.compareAtPrice) : undefined;
  const displayedPrice = displayedMoney ? formatMoney(displayedMoney) : configuration.price;
  const displayedPriceExVat = displayedMoney ? formatUkPriceExcludingVat(displayedMoney) : configuration.priceExVat;
  const savingsPercent = sellingPlanSavingsPercent(selectedVariant?.money, selectedSellingPlan?.price);
  const hasOptions = (product.variants?.length ?? 0) > 1;
  const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40";

  useEffect(() => {
    const productKey = product.id ?? product.handle ?? product.title;
    if (!analyticsEnabled || trackedProductRef.current === productKey) return;
    trackedProductRef.current = productKey;
    trackViewItem(product, selectedVariant);
  }, [analyticsEnabled, product, selectedVariant]);

  async function handleAddToCart() {
    if (!selectedVariant || selectedVariant.available === false || adding || cartLoading) return;
    setAdding(true);
    setCartError(null);
    try {
      await addItem(
        selectedVariant.id,
        quantity,
        subscriptionSelected ? selectedSellingPlan?.sellingPlan.id : undefined,
      );
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
      <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight lg:text-4xl">{product.title}</h1>
      {product.reviewRating && <a href="#customer-reviews" className="mt-3 inline-flex min-h-10 items-center rounded text-sm hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label={`Read ${product.reviewRating.count} customer reviews`}><ReviewStars {...product.reviewRating} /></a>}
      <div aria-live="polite" aria-atomic="true" className="mt-3 space-y-2">
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="flex flex-wrap items-baseline gap-2">
            {compareAtPrice && <span className="text-base text-muted"><span className="sr-only">Previous price: </span><del>{formatMoney(compareAtPrice)}</del></span>}
            <span className="text-3xl font-bold text-accent"><span className="sr-only">{compareAtPrice ? "Sale price: " : "Price: "}</span>{displayedPrice}</span>
            <span className="text-sm text-muted">(Inc. VAT)</span>
          </p>
          {unitPrice && <p className="text-sm text-muted sm:ml-auto">{unitPrice}</p>}
        </div>
        {displayedPriceExVat && <p className="text-sm text-muted">Excl. VAT: {displayedPriceExVat}</p>}
        {configuration.available === false && <p className="font-medium text-muted">Currently unavailable</p>}
      </div>

      {sellingPlanAllocations.length > 0 && selectedVariant?.money && selectedSellingPlan && (
        <fieldset className="mt-5 rounded-xl border border-border bg-surface p-3 sm:p-4">
          <legend className="px-1 text-sm font-semibold">Purchase options</legend>
          <div className="space-y-2">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted">
              <input
                type="radio"
                name={`${selectId}-purchase-type`}
                value="one-time"
                checked={!subscriptionSelected}
                onChange={() => setPurchaseSelection({
                  variantId: selectedVariant.id,
                  type: "one-time",
                  sellingPlanId: null,
                })}
                className="size-4 accent-primary"
              />
              <span className="min-w-0 flex-1 font-medium">One-time purchase</span>
              <span className="shrink-0 font-semibold tabular-nums">{formatMoney(selectedVariant.money)}</span>
            </label>
            <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted">
              <input
                type="radio"
                name={`${selectId}-purchase-type`}
                value="subscription"
                checked={subscriptionSelected}
                onChange={() => setPurchaseSelection({
                  variantId: selectedVariant.id,
                  type: "subscription",
                  sellingPlanId: selectedSellingPlan.sellingPlan.id,
                })}
                className="size-4 accent-primary"
              />
              <span className="min-w-0 flex-1 font-medium">
                {selectedSellingPlan.sellingPlan.groupName || "Subscribe"}
                {savingsPercent && <span className="ml-2 text-sm text-primary">Save {savingsPercent}%</span>}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">{formatMoney(selectedSellingPlan.price)}</span>
            </label>
          </div>
          {subscriptionSelected && (
            sellingPlanAllocations.length > 1 ? (
              <div className="mt-3 border-t border-border pt-3">
                <label htmlFor={`${selectId}-selling-plan`} className="mb-2 block text-sm font-semibold">
                  {selectedSellingPlan.sellingPlan.options[0]?.name || "Subscription plan"}
                </label>
                <select
                  id={`${selectId}-selling-plan`}
                  value={selectedSellingPlan.sellingPlan.id}
                  onChange={(event) => setPurchaseSelection({
                    variantId: selectedVariant.id,
                    type: "subscription",
                    sellingPlanId: event.target.value,
                  })}
                  className="min-h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {sellingPlanAllocations.map((allocation) => (
                    <option key={allocation.sellingPlan.id} value={allocation.sellingPlan.id}>
                      {sellingPlanOptionLabel(allocation)} — {formatMoney(allocation.price)}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="mt-2 border-t border-border px-2 pt-3 text-sm text-muted">
                {sellingPlanOptionLabel(selectedSellingPlan)}
              </p>
            )
          )}
        </fieldset>
      )}

      <ProductDispatchMessage
        vendor={product.vendor}
        tags={product.tags}
        collectionHandles={product.collectionHandles}
      />

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
