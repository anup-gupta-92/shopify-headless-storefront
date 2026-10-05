"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { SHOP_PRODUCT_GRID_CLASSNAME } from "@/components/product-grid-layout";
import type { CatalogPage } from "@/types/catalog";

interface ShopProductGridProps {
  initialPage: CatalogPage;
  queryString: string;
  loadMorePath?: string;
  clearHref?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  pagination?: {
    previousHref?: string;
    nextHref?: string;
  };
}

export default function ShopProductGrid({
  initialPage,
  queryString,
  loadMorePath = "/api/shop",
  clearHref = "/shop",
  emptyTitle = "No products match these filters.",
  emptyDescription = "Try widening the price range or clearing a brand or category.",
  emptyActionLabel = "Clear filters",
  pagination,
}: ShopProductGridProps) {
  const [products, setProducts] = useState(initialPage.products);
  const [pageInfo, setPageInfo] = useState(initialPage.pageInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedMore, setHasLoadedMore] = useState(false);

  async function loadMore() {
    if (loading || !pageInfo.hasNextPage || !pageInfo.endCursor) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(queryString);
      params.set("cursor", pageInfo.endCursor);
      const response = await fetch(`${loadMorePath}?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { page?: CatalogPage; error?: string } | null;
      if (!response.ok || !body?.page) throw new Error(body?.error || "More products could not be loaded.");

      setProducts((current) => {
        const existingIds = new Set(current.map((product) => product.id));
        return [...current, ...body.page!.products.filter((product) => !existingIds.has(product.id))];
      });
      setPageInfo(body.page.pageInfo);
      setHasLoadedMore(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "More products could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  if (!products.length) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <h2 className="text-xl font-semibold">{emptyTitle}</h2>
        <p className="mt-2 text-muted">{emptyDescription}</p>
        <Link href={clearHref} className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {emptyActionLabel}
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Products" aria-busy={loading}>
      <div className={SHOP_PRODUCT_GRID_CLASSNAME}>
        {products.map((product) => <ProductCard
          key={product.id}
          title={product.title}
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          hasSaleVariant={product.hasSaleVariant}
          startingVariantIsOnSale={product.startingVariantIsOnSale}
          vendor={product.vendor}
          category={product.category}
          available={product.available}
          imageUrl={product.image}
          imageAlt={product.imageAlt}
          handle={product.handle}
          cardAction={product.cardAction}
          reviewRating={product.reviewRating}
        />)}
        {loading && Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={`loading-${index}`} />)}
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-border bg-surface-muted p-3 text-sm">{error}</p>}

      {(pageInfo.hasNextPage || (!hasLoadedMore && (pagination?.previousHref || pagination?.nextHref))) && (
        <nav
          aria-label="Catalogue pagination"
          className="mt-8 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 sm:gap-4"
        >
          <div className="min-w-0 justify-self-start">
            {!hasLoadedMore && pagination?.previousHref && (
              <Link
                href={pagination.previousHref}
                rel="prev"
                className="inline-flex min-h-11 items-center rounded text-[0.7rem] font-medium leading-tight text-muted transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
              >
                ← Previous products
              </Link>
            )}
          </div>

          <div className="justify-self-center">
            {pageInfo.hasNextPage && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loading}
                className="min-h-12 rounded-xl border border-border bg-surface px-6 font-semibold transition hover:border-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Loading more…" : "Load more"}
              </button>
            )}
          </div>

          <div className="min-w-0 justify-self-end text-right">
            {!hasLoadedMore && pagination?.nextHref && (
              <Link
                href={pagination.nextHref}
                rel="next"
                className="inline-flex min-h-11 items-center rounded text-[0.7rem] font-medium leading-tight text-muted transition hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm"
              >
                Next products →
              </Link>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
