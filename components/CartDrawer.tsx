"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import CartLineItem from "@/components/CartLineItem";
import { useCart } from "@/components/CartProvider";
import { startNavigationProgress } from "@/components/RouteLoadingSignal";
import { formatMoney } from "@/lib/shopify/pricing";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function CartDrawer() {
  const { cart, drawerOpen, loading, checkoutLoading, error, closeDrawer, clearError, updateLine, removeLine, prepareCheckout } = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  async function handleCheckout() {
    try {
      const checkoutUrl = await prepareCheckout();
      flushSync(() => startNavigationProgress());
      window.location.assign(checkoutUrl);
    } catch {
      // CartProvider owns the buyer-safe error state and keeps the drawer open.
    }
  }

  useEffect(() => {
    if (!drawerOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [closeDrawer, drawerOpen]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-[100]">
      <button type="button" aria-label="Close cart" onClick={closeDrawer} className="absolute inset-0 bg-black/60" />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-md flex-col overflow-hidden border-l border-border bg-background text-foreground shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-4 sm:px-6">
          <h2 id="cart-drawer-title" className="text-xl font-bold">Your Cart</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={closeDrawer}
            aria-label="Close cart drawer"
            className={`inline-flex size-11 items-center justify-center rounded-lg border border-border bg-surface text-xl ${focusClass}`}
          >
            ×
          </button>
        </header>

        {error && <div role="alert" className="mx-4 mt-4 flex items-start justify-between gap-3 rounded-lg border border-border bg-surface-muted p-3 text-sm sm:mx-6">
          <span>{error}</span>
          <button type="button" onClick={clearError} aria-label="Dismiss cart error" className={`shrink-0 font-bold ${focusClass}`}>×</button>
        </div>}

        {!cart?.lines.length ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <p className="text-xl font-semibold">Your cart is empty</p>
            <Link href="/" onClick={closeDrawer} className={`mt-5 rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground ${focusClass}`}>
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2 sm:px-6">
              <ul className="divide-y divide-border">
                {cart.lines.map((line) => (
                  <CartLineItem
                    key={line.id}
                    line={line}
                    loading={loading}
                    layout="drawer"
                    onNavigate={closeDrawer}
                    updateLine={updateLine}
                    removeLine={removeLine}
                  />
                ))}
              </ul>
            </div>

            <footer className="shrink-0 space-y-4 border-t border-border bg-background px-4 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-4 font-semibold">
                <span>Subtotal</span>
                <span className="text-lg">{formatMoney(cart.cost.subtotalAmount)}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/cart"
                  onClick={closeDrawer}
                  className={`inline-flex min-h-12 items-center justify-center rounded-xl border border-primary px-3 py-3 text-center text-sm font-semibold text-primary transition hover:bg-primary/10 sm:px-5 sm:text-base ${focusClass}`}
                >
                  View Cart
                </Link>
                <button
                  type="button"
                  disabled={loading || cart.totalQuantity < 1}
                  onClick={() => void handleCheckout()}
                  className={`min-h-12 rounded-xl bg-primary px-3 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted sm:px-5 sm:text-base ${focusClass}`}
                >
                  {checkoutLoading ? "Preparing…" : "Checkout"}
                </button>
              </div>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
