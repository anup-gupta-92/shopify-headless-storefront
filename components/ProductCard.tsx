"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { ProductSummary } from "@/types/product";
import ReviewStars from "@/components/ReviewStars";
import { formatMoney } from "@/lib/shopify/pricing";

interface ProductCardProps {
  title: string;
  price: string;
  compareAtPrice?: ProductSummary["compareAtPrice"];
  sku?: string;
  vendor?: string;
  category?: string;
  available?: boolean;
  imageAlt?: string;
  handle: string;
  imageUrl: string;
  cardAction: ProductSummary["cardAction"];
  reviewRating?: ProductSummary["reviewRating"];
  compact?: boolean;
}

export default function ProductCard({ title, price, compareAtPrice, sku, vendor, category, available = true, handle, imageUrl, imageAlt, cardAction, reviewRating, compact = false }: ProductCardProps) {
  const { addItem, loading: cartLoading } = useCart();
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const meta = [vendor, category].filter(Boolean).join(" · ");
  const productHref = `/products/${handle}`;

  async function addToCart() {
    if (cardAction.kind !== "add" || adding || cartLoading) return;
    setAdding(true);
    setError(null);
    try {
      await addItem(cardAction.variantId, 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This product could not be added. Please try again.");
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="group/card relative flex h-full flex-col rounded-xl border border-border bg-surface p-3 transition hover:border-primary/50 sm:p-5">
      <Link href={productHref} aria-label={`View ${title}`} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="sr-only">View {title}</span>
      </Link>

      <div className="pointer-events-none relative mb-2.5 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted sm:mb-4">
        {imageUrl ? <Image src={imageUrl} alt={imageAlt || title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover transition duration-300 group-hover/card:scale-105" /> : <div className="flex h-full items-center justify-center text-muted">Image unavailable</div>}
        {compareAtPrice && <span className="absolute left-3 top-3 z-[1] rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold tracking-wide text-primary-foreground shadow-sm">SALE</span>}
      </div>
      {sku && <span className="pointer-events-none mb-0.5 block font-mono text-xs text-muted sm:mb-1">Product Code: {sku}</span>}
      {meta && <span className="pointer-events-none mb-0.5 block text-xs font-medium uppercase tracking-wide text-muted sm:mb-1">{meta}</span>}
      <h3 className={`pointer-events-none mb-0.5 font-bold text-foreground transition group-hover/card:text-primary sm:mb-1 sm:text-base sm:leading-normal lg:text-lg ${compact ? "line-clamp-3 text-[0.8125rem] leading-snug sm:line-clamp-none" : "text-sm"}`}>{title}</h3>
      <div className="pointer-events-none min-h-5">{reviewRating && <ReviewStars {...reviewRating} compact />}</div>
      <div className="pointer-events-none mt-auto pt-1.5 sm:pt-2">
        <div className="flex items-baseline gap-2">
          {compareAtPrice && (
            <span className="text-xs text-muted">
              <span className="sr-only">Original price: </span>
              <del>{formatMoney(compareAtPrice)}</del>
            </span>
          )}

          <span className="font-semibold text-accent">
            <span className="sr-only">
              {compareAtPrice ? "Sale price: " : "Price: "}
            </span>
            {price}
          </span>
        </div>
      </div>
      {!available && <p className="pointer-events-none mt-2 text-sm font-medium text-muted">Currently unavailable</p>}

      {cardAction.kind === "add" ? (
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={adding || cartLoading}
          className="relative z-20 mt-3 min-h-11 w-full rounded-lg bg-foreground px-3 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60 sm:mt-4 sm:px-4"
        >
          {adding ? "Adding…" : "Add to Cart"}
        </button>
      ) : cardAction.kind === "options" ? (
        <Link href={productHref} className="relative z-20 mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-foreground px-3 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:mt-4 sm:px-4">
          Choose Options
        </Link>
      ) : (
        <span className="pointer-events-none relative z-20 mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-surface-muted px-3 py-2 text-center text-sm font-semibold text-muted sm:mt-4 sm:px-4">Unavailable</span>
      )}

      {error && <p role="alert" className="relative z-20 mt-2 text-sm text-muted">{error}</p>}
    </article>
  );
}
