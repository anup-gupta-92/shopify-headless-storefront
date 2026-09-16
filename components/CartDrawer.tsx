"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/components/CartProvider";
import { formatMoney } from "@/lib/shopify/pricing";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function CartDrawer() {
  const { cart, drawerOpen, loading, error, closeDrawer, clearError, updateLine, removeLine } = useCart();
  const drawerRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

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
                {cart.lines.map((line) => {
                  const displayOptions = line.merchandise.selectedOptions.filter(
                    (option) => !(option.name === "Title" && option.value === "Default Title"),
                  );
                  return <li key={line.id} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-5">
                    <Link href={`/products/${line.merchandise.product.handle}`} onClick={closeDrawer} className={`relative aspect-square overflow-hidden rounded-lg border border-border bg-surface ${focusClass}`}>
                      {line.merchandise.image ? <Image
                        src={line.merchandise.image.url}
                        alt={line.merchandise.image.altText || line.merchandise.product.title}
                        fill
                        sizes="88px"
                        className="object-contain"
                      /> : <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">No image</span>}
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/products/${line.merchandise.product.handle}`} onClick={closeDrawer} className={`block break-words font-semibold hover:text-primary ${focusClass}`}>
                        {line.merchandise.product.title}
                      </Link>
                      {displayOptions.length > 0 && <p className="mt-1 break-words text-sm text-muted">
                        {displayOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}
                      </p>}
                      {line.merchandise.productCode && <p className="mt-1 break-all font-mono text-xs text-muted">Product Code: {line.merchandise.productCode}</p>}
                      <p className="mt-2 font-semibold text-accent">{formatMoney(line.cost.totalAmount)}</p>
                      {!line.merchandise.availableForSale && <p className="mt-1 text-sm font-medium text-muted">Currently unavailable</p>}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${line.merchandise.product.title}`}
                          disabled={loading || line.quantity <= 1}
                          onClick={() => void updateLine(line.id, line.quantity - 1).catch(() => undefined)}
                          className={`inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
                        >−</button>
                        <output aria-label={`Quantity of ${line.merchandise.product.title}`} className="min-w-8 text-center font-semibold tabular-nums">{line.quantity}</output>
                        <button
                          type="button"
                          aria-label={`Increase quantity of ${line.merchandise.product.title}`}
                          disabled={loading || !line.merchandise.availableForSale}
                          onClick={() => void updateLine(line.id, line.quantity + 1).catch(() => undefined)}
                          className={`inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
                        >+</button>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => void removeLine(line.id).catch(() => undefined)}
                          className={`ml-auto min-h-10 rounded-lg px-2 text-sm font-medium text-muted underline decoration-border underline-offset-4 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
                        >Remove <span className="sr-only">{line.merchandise.product.title}</span></button>
                      </div>
                    </div>
                  </li>;
                })}
              </ul>
            </div>

            <footer className="shrink-0 space-y-4 border-t border-border bg-background px-4 py-5 sm:px-6">
              <div className="flex items-baseline justify-between gap-4 font-semibold">
                <span>Subtotal</span>
                <span className="text-lg">{formatMoney(cart.cost.subtotalAmount)}</span>
              </div>
              <button type="button" disabled className="min-h-12 w-full cursor-not-allowed rounded-xl bg-surface-muted px-5 py-3 font-semibold text-muted">
                Checkout — Coming Next
              </button>
            </footer>
          </>
        )}
      </aside>
    </div>
  );
}
