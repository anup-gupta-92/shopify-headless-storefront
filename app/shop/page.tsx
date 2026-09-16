import type { Metadata } from "next";
import Link from "next/link";
import ShopControls from "@/components/ShopControls";
import ShopProductGrid from "@/components/ShopProductGrid";
import { catalogSearchParams, getCatalogFacets, getCatalogPage, parseCatalogParams } from "@/lib/shopify/catalog";

export const metadata: Metadata = {
  title: "Shop",
  description: "Browse products available from Apex Business Supplies.",
};

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = parseCatalogParams(await searchParams);
  const [initialPage, facets] = await Promise.all([
    getCatalogPage(filters),
    getCatalogFacets(),
  ]);
  const queryString = catalogSearchParams(filters).toString();

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
          <ol className="flex items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">Shop</li>
          </ol>
        </nav>

        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Browse the catalogue</p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight">Shop</h1>
          <p className="mt-3 max-w-2xl text-muted">Explore products currently published to the Apex storefront.</p>
        </div>

        <ShopControls filters={filters} facets={facets} queryString={queryString}>
          <ShopProductGrid key={queryString || "default"} initialPage={initialPage} queryString={queryString} />
        </ShopControls>
      </div>
    </main>
  );
}
