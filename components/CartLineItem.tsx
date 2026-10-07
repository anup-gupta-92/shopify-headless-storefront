"use client";

import Image from "next/image";
import Link from "next/link";
import { formatMoney } from "@/lib/shopify/pricing";
import type { CartLine } from "@/types/cart";

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

interface CartLineItemProps {
  line: CartLine;
  loading: boolean;
  layout: "drawer" | "page";
  onNavigate?: () => void;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
}

function unitPrice(line: CartLine) {
  const lineAmount = Number(line.cost.totalAmount.amount);
  if (!Number.isFinite(lineAmount) || line.quantity < 1) return null;

  return formatMoney({
    amount: String(lineAmount / line.quantity),
    currencyCode: line.cost.totalAmount.currencyCode,
  });
}

export default function CartLineItem({
  line,
  loading,
  layout,
  onNavigate,
  updateLine,
  removeLine,
}: CartLineItemProps) {
  const isDrawer = layout === "drawer";
  const productTitle = line.merchandise.product.title;
  const productHref = `/products/${line.merchandise.product.handle}`;
  const displayOptions = line.merchandise.selectedOptions.filter(
    (option) => !(option.name === "Title" && option.value === "Default Title"),
  );
  const displayedUnitPrice = unitPrice(line);
  const sellingPlan = line.sellingPlanAllocation?.sellingPlan;
  const sellingPlanDetails = sellingPlan?.options.map((option) => option.value).filter(Boolean).join(" · ")
    || sellingPlan?.name;

  return (
    <li className={isDrawer
      ? "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 py-5"
      : "grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3 p-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5 sm:p-5"
    }>
      <Link
        href={productHref}
        onClick={onNavigate}
        className={`relative aspect-square self-start overflow-hidden rounded-lg border border-border bg-surface ${focusClass}`}
      >
        {line.merchandise.image ? (
          <Image
            src={line.merchandise.image.url}
            alt={line.merchandise.image.altText || productTitle}
            fill
            sizes={isDrawer ? "88px" : "(max-width: 639px) 88px, 112px"}
            className="object-contain"
            style={{ objectFit: "contain" }}
          />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">No image</span>
        )}
      </Link>

      <div className="min-w-0">
        <Link
          href={productHref}
          onClick={onNavigate}
          className={`block break-words font-semibold hover:text-primary ${focusClass}`}
        >
          {productTitle}
        </Link>
        {displayOptions.length > 0 && (
          <p className="mt-1 break-words text-sm text-muted">
            {displayOptions.map((option) => `${option.name}: ${option.value}`).join(" · ")}
          </p>
        )}
        {sellingPlanDetails && (
          <p className="mt-1 text-sm font-medium text-primary">Subscribe · {sellingPlanDetails}</p>
        )}
        {line.merchandise.productCode && (
          <p className="mt-1 break-all font-mono text-xs text-muted">Product Code: {line.merchandise.productCode}</p>
        )}
        {!line.merchandise.availableForSale && (
          <p className="mt-1 text-sm font-medium text-muted">Currently unavailable</p>
        )}

        {isDrawer ? (
          <p className="mt-2 font-semibold text-accent">{formatMoney(line.cost.totalAmount)}</p>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3 text-sm sm:max-w-md">
            <div>
              <dt className="text-muted">Unit price</dt>
              <dd className="mt-0.5 font-semibold text-foreground">{displayedUnitPrice ?? "—"}</dd>
            </div>
            <div className="text-right">
              <dt className="text-muted">Line total</dt>
              <dd className="mt-0.5 font-semibold text-accent">{formatMoney(line.cost.totalAmount)}</dd>
            </div>
          </dl>
        )}

        <div className={`${isDrawer ? "mt-3" : "mt-4"} flex flex-wrap items-center gap-2`}>
          <button
            type="button"
            aria-label={`Decrease quantity of ${productTitle}`}
            disabled={loading || line.quantity <= 1}
            onClick={() => void updateLine(line.id, line.quantity - 1).catch(() => undefined)}
            className={`inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
          >
            −
          </button>
          <output
            aria-label={`Quantity of ${productTitle}`}
            className="min-w-8 text-center font-semibold tabular-nums"
          >
            {line.quantity}
          </output>
          <button
            type="button"
            aria-label={`Increase quantity of ${productTitle}`}
            disabled={loading || !line.merchandise.availableForSale}
            onClick={() => void updateLine(line.id, line.quantity + 1).catch(() => undefined)}
            className={`inline-flex size-10 items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
          >
            +
          </button>
          <button
            type="button"
            disabled={loading}
            aria-label={`Remove ${productTitle} from cart`}
            onClick={() => void removeLine(line.id).catch(() => undefined)}
            className={`ml-auto min-h-10 rounded-lg px-2 text-sm font-medium text-muted underline decoration-border underline-offset-4 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${focusClass}`}
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
