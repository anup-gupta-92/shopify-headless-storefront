"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import type { ProductSummary } from "@/types/product";

interface ProductCardProps {
  title: string;
  price: string;
  sku?: string;
  vendor?: string;
  category?: string;
  available?: boolean;
  imageAlt?: string;
  handle: string;
  imageUrl: string;
  cardAction: ProductSummary["cardAction"];
}

export default function ProductCard({ title, price, sku, vendor, category, available = true, handle, imageUrl, imageAlt, cardAction }: ProductCardProps) {
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
    <article className="group/card relative flex h-full flex-col rounded-xl border border-border bg-surface p-5 transition hover:border-primary/50">
      <Link href={productHref} aria-label={`View ${title}`} className="absolute inset-0 z-10 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <span className="sr-only">View {title}</span>
      </Link>

      <div className="pointer-events-none relative mb-4 aspect-square w-full overflow-hidden rounded-lg bg-surface-muted">
        {imageUrl ? <Image src={imageUrl} alt={imageAlt || title} fill sizes="(max-width: 768px) 100vw, 25vw" className="object-cover transition duration-300 group-hover/card:scale-105" /> : <div className="flex h-full items-center justify-center text-muted">Image unavailable</div>}
      </div>
      {sku && <span className="pointer-events-none mb-1 block font-mono text-xs text-muted">Product Code: {sku}</span>}
      {meta && <span className="pointer-events-none mb-1 block text-xs font-medium uppercase tracking-wide text-muted">{meta}</span>}
      <h3 className="pointer-events-none mb-1 text-lg font-bold text-foreground transition group-hover/card:text-primary">{title}</h3>
      <p className="pointer-events-none mt-auto pt-2 font-medium text-accent">{price}</p>
      {!available && <p className="pointer-events-none mt-2 text-sm font-medium text-muted">Currently unavailable</p>}

      {cardAction.kind === "add" ? (
        <button
          type="button"
          onClick={() => void addToCart()}
          disabled={adding || cartLoading}
          className="relative z-20 mt-4 min-h-11 w-full rounded-lg bg-foreground px-4 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60"
        >
          {adding ? "Adding…" : "Add to Cart"}
        </button>
      ) : cardAction.kind === "options" ? (
        <Link href={productHref} className="relative z-20 mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-foreground px-4 py-2 text-center text-sm font-semibold text-background transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Choose Options
        </Link>
      ) : (
        <span className="pointer-events-none relative z-20 mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-surface-muted px-4 py-2 text-center text-sm font-semibold text-muted">Unavailable</span>
      )}

      {error && <p role="alert" className="relative z-20 mt-2 text-sm text-muted">{error}</p>}
    </article>
  );
}
