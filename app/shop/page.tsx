import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShopControls from "@/components/ShopControls";
import ShopProductGrid from "@/components/ShopProductGrid";
import { siteConfig } from "@/config/site";
import { catalogSearchParams, getCatalogFacets, getCatalogPageByNumber, parseCatalogParams } from "@/lib/shopify/catalog";
import { catalogPaginationHref, hasCatalogSeoFilters, parseCatalogPageNumber } from "@/lib/shopify/catalog-pagination";

const shopTitle = "Business Supplies | Apex Business Supplies";
const shopDescription = "Shop packaging supplies, PPE, abrasives, cleaning products and workplace essentials from Apex Business Supplies.";
const shopUrl = `${siteConfig.url}/shop`;

interface ShopPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: ShopPageProps): Promise<Metadata> {
  const requestedParams = await searchParams;
  const pageNumber = parseCatalogPageNumber(requestedParams.page);
  const filters = parseCatalogParams(requestedParams);
  const queryString = catalogSearchParams(filters).toString();
  const canonical = pageNumber && pageNumber > 1 && !hasCatalogSeoFilters(queryString)
    ? catalogPaginationHref(shopUrl, queryString, pageNumber)
    : shopUrl;

  return {
    title: { absolute: shopTitle },
    description: shopDescription,
    alternates: { canonical },
    ...(pageNumber === null ? { robots: { index: false, follow: false } } : {}),
    openGraph: { type: "website", url: canonical, title: shopTitle, description: shopDescription, siteName: siteConfig.name },
    twitter: { card: "summary", title: shopTitle, description: shopDescription },
  };
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const requestedParams = await searchParams;
  const pageNumber = parseCatalogPageNumber(requestedParams.page);
  if (pageNumber === null) notFound();

  const filters = parseCatalogParams(requestedParams);
  const [initialPage, facets] = await Promise.all([
    getCatalogPageByNumber(filters, pageNumber),
    getCatalogFacets(),
  ]);
  if (!initialPage) notFound();

  const queryString = catalogSearchParams(filters).toString();
  const previousHref = pageNumber > 1 ? catalogPaginationHref("/shop", queryString, pageNumber - 1) : undefined;
  const nextHref = initialPage.pageInfo.hasNextPage
    ? catalogPaginationHref("/shop", queryString, pageNumber + 1)
    : undefined;

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

        <ShopControls filters={filters} facets={facets} queryString={queryString} showSaleFilter>
          <ShopProductGrid
            key={`${queryString || "default"}:page-${pageNumber}`}
            initialPage={initialPage}
            queryString={queryString}
            pagination={{ previousHref, nextHref }}
          />
        </ShopControls>
      </div>
    </main>
  );
}
