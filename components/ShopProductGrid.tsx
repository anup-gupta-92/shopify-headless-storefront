"use client";

import { useState } from "react";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import type { CatalogPage } from "@/types/catalog";

interface ShopProductGridProps {
  initialPage: CatalogPage;
  queryString: string;
}

export default function ShopProductGrid({ initialPage, queryString }: ShopProductGridProps) {
  const [products, setProducts] = useState(initialPage.products);
  const [pageInfo, setPageInfo] = useState(initialPage.pageInfo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMore() {
    if (loading || !pageInfo.hasNextPage || !pageInfo.endCursor) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(queryString);
      params.set("cursor", pageInfo.endCursor);
      const response = await fetch(`/api/shop?${params.toString()}`, { cache: "no-store" });
      const body = await response.json().catch(() => null) as { page?: CatalogPage; error?: string } | null;
      if (!response.ok || !body?.page) throw new Error(body?.error || "More products could not be loaded.");

      setProducts((current) => {
        const existingIds = new Set(current.map((product) => product.id));
        return [...current, ...body.page!.products.filter((product) => !existingIds.has(product.id))];
      });
      setPageInfo(body.page.pageInfo);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "More products could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  if (!products.length) {
    return (
      <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
        <h2 className="text-xl font-semibold">No products match these filters.</h2>
        <p className="mt-2 text-muted">Try widening the price range or clearing a brand or category.</p>
        <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Clear filters
        </Link>
      </div>
    );
  }

  return (
    <section aria-label="Products" aria-busy={loading}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => <ProductCard
          key={product.id}
          title={product.title}
          price={product.price}
          vendor={product.vendor}
          category={product.category}
          available={product.available}
          imageUrl={product.image}
          imageAlt={product.imageAlt}
          handle={product.handle}
          cardAction={product.cardAction}
        />)}
        {loading && Array.from({ length: 3 }, (_, index) => <ProductCardSkeleton key={`loading-${index}`} />)}
      </div>

      {error && <p role="alert" className="mt-6 rounded-lg border border-border bg-surface-muted p-3 text-sm">{error}</p>}

      {pageInfo.hasNextPage && <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={() => void loadMore()}
          disabled={loading}
          className="min-h-12 rounded-xl border border-border bg-surface px-6 font-semibold transition hover:border-primary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading more…" : "Load more"}
        </button>
      </div>}
    </section>
  );
}
