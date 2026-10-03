"use client";

import Link from "next/link";
import { flushSync } from "react-dom";
import CartLineItem from "@/components/CartLineItem";
import { useCart } from "@/components/CartProvider";
import { startNavigationProgress } from "@/components/RouteLoadingSignal";
import { formatMoney, getUkVatInclusiveBreakdown } from "@/lib/shopify/pricing";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function CartLoadingState() {
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
      <div className="h-6 w-40 animate-pulse rounded bg-surface-muted motion-reduce:animate-none" />
      <div className="mt-5 h-28 animate-pulse rounded-xl bg-surface-muted motion-reduce:animate-none" />
      <span className="sr-only">Loading your cart</span>
    </div>
  );
}

export default function CartPageContent() {
  const {
    cart,
    loading,
    checkoutLoading,
    error,
    clearError,
    refreshCart,
    updateLine,
    removeLine,
    prepareCheckout,
  } = useCart();

  async function handleCheckout() {
    try {
      const checkoutUrl = await prepareCheckout();
      flushSync(() => startNavigationProgress());
      window.location.assign(checkoutUrl);
    } catch {
      // CartProvider owns the buyer-safe error state.
    }
  }

  if (loading && !cart && !error) return <CartLoadingState />;

  if (error && !cart) {
    return (
      <section aria-labelledby="cart-unavailable-heading" className="rounded-2xl border border-border bg-surface px-5 py-10 text-center sm:px-8">
        <h2 id="cart-unavailable-heading" className="text-2xl font-bold">Your cart is temporarily unavailable</h2>
        <p role="alert" className="mx-auto mt-3 max-w-xl text-muted">{error}</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void refreshCart()}
          className={`mt-6 min-h-12 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 ${focusClass}`}
        >
          {loading ? "Trying again…" : "Try Again"}
        </button>
      </section>
    );
  }

  if (!cart?.lines.length) {
    return (
      <section aria-labelledby="empty-cart-heading" className="rounded-2xl border border-border bg-surface px-5 py-12 text-center sm:px-8 sm:py-16">
        <span aria-hidden="true" className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-2xl text-primary">○</span>
        <h2 id="empty-cart-heading" className="mt-5 text-2xl font-bold sm:text-3xl">Your cart is empty</h2>
        <p className="mx-auto mt-3 max-w-lg leading-7 text-muted">Browse our business supplies and add the products you need to get started.</p>
        <Link
          href="/shop"
          className={`mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90 ${focusClass}`}
        >
          Continue Shopping
        </Link>
      </section>
    );
  }

  const vatBreakdown = getUkVatInclusiveBreakdown(cart.cost.subtotalAmount);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(19rem,24rem)] lg:gap-8 xl:gap-10">
      <section aria-labelledby="cart-items-heading" className="min-w-0 overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <h2 id="cart-items-heading" className="text-xl font-bold">Cart items</h2>
          <p className="text-sm text-muted">{cart.totalQuantity} {cart.totalQuantity === 1 ? "item" : "items"}</p>
        </div>

        {error && (
          <div role="alert" className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm sm:mx-5">
            <span>{error}</span>
            <button type="button" onClick={clearError} aria-label="Dismiss cart error" className={`shrink-0 font-bold ${focusClass}`}>×</button>
          </div>
        )}

        <ul className="divide-y divide-border">
          {cart.lines.map((line) => (
            <CartLineItem
              key={line.id}
              line={line}
              loading={loading}
              layout="page"
              updateLine={updateLine}
              removeLine={removeLine}
            />
          ))}
        </ul>
      </section>

      <aside aria-labelledby="order-summary-heading" className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
        <h2 id="order-summary-heading" className="text-xl font-bold">Order summary</h2>
        <dl className="mt-5 border-y border-border py-4">
          {vatBreakdown && (
            <>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <dt className="text-muted">Subtotal (ex VAT)</dt>
                <dd className="font-semibold tabular-nums text-foreground">{formatMoney(vatBreakdown.subtotalExVat)}</dd>
              </div>
              <div className="mt-3 flex items-baseline justify-between gap-4 text-sm">
                <dt className="text-muted">VAT (20%)</dt>
                <dd className="font-semibold tabular-nums text-foreground">{formatMoney(vatBreakdown.vat)}</dd>
              </div>
            </>
          )}
          <div className={`${vatBreakdown ? "mt-4 border-t border-border pt-4" : ""} flex items-baseline justify-between gap-4`}>
            <dt className="font-bold">Total (inc VAT)</dt>
            <dd className="text-xl font-bold tabular-nums text-foreground">
              {formatMoney(vatBreakdown?.totalIncVat ?? cart.cost.subtotalAmount)}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-sm leading-6 text-muted">Shipping calculated at checkout.</p>
        <button
          type="button"
          disabled={loading || cart.totalQuantity < 1}
          onClick={() => void handleCheckout()}
          className={`mt-5 min-h-12 w-full rounded-xl bg-primary px-5 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted ${focusClass}`}
        >
          {checkoutLoading ? "Preparing checkout…" : "Proceed to Checkout"}
        </button>
        <Link
          href="/shop"
          className={`mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-primary px-5 py-3 text-center font-semibold text-primary transition hover:bg-primary/10 ${focusClass}`}
        >
          Continue Shopping
        </Link>
      </aside>
    </div>
  );
}
