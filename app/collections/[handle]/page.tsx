import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ShopControls from "@/components/ShopControls";
import ShopifyRichText from "@/components/ShopifyRichText";
import ShopProductGrid from "@/components/ShopProductGrid";
import { catalogSearchParams, parseCatalogParams } from "@/lib/shopify/catalog";
import { getCollectionByHandle, getCollectionFacets, getCollectionPage } from "@/lib/shopify/collections";

interface CollectionPageProps {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCollectionByHandle(handle);
  if (!collection) return { title: "Collection not found" };
  return {
    title: collection.title,
    description: collection.description || `Browse ${collection.title} from Apex Business Supplies.`,
    alternates: {
      canonical: `/collections/${encodeURIComponent(collection.handle)}`,
    },
  };
}

export default async function CollectionPage({ params, searchParams }: CollectionPageProps) {
  const [{ handle }, requestedParams] = await Promise.all([params, searchParams]);
  const parsed = parseCatalogParams(requestedParams);
  const filters = { ...parsed, productTypes: [] };
  const [collection, initialPage, facets] = await Promise.all([
    getCollectionByHandle(handle),
    getCollectionPage(handle, filters),
    getCollectionFacets(handle),
  ]);

  if (!collection || !initialPage || !facets) notFound();

  const queryString = catalogSearchParams(filters).toString();
  const basePath = `/collections/${encodeURIComponent(collection.handle)}`;

  return (
    <main className="min-h-screen bg-background py-8 text-foreground sm:py-10">
      <div className="site-container">
        <nav aria-label="Breadcrumb" className="mb-5 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-2">
            <li><Link href="/" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Home</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li><Link href="/shop" className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary">Shop</Link></li>
            <li aria-hidden="true">&gt;</li>
            <li aria-current="page">{collection.title}</li>
          </ol>
        </nav>

        <header className={collection.image ? "grid items-center gap-6 md:grid-cols-[minmax(0,1fr)_18rem]" : undefined}>
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary">Shop collection</p>
            <h1 className="mt-2 break-words text-4xl font-extrabold tracking-tight">{collection.title}</h1>
            {(collection.descriptionHtml || collection.description) && <div className="mt-4 max-w-3xl">
              <ShopifyRichText html={collection.descriptionHtml} text={collection.description} />
            </div>}
          </div>
          {collection.image && <div className="relative aspect-[16/9] overflow-hidden rounded-xl border border-border bg-white">
            <Image
              src={collection.image.url}
              alt={collection.image.altText || collection.title}
              fill
              sizes="(min-width: 768px) 288px, 100vw"
              className="object-contain p-2"
            />
          </div>}
        </header>

        <ShopControls
          filters={filters}
          facets={facets}
          queryString={queryString}
          basePath={basePath}
          showCategories={false}
          facetDescription="Brand counts include in-stock products in this collection only."
        >
          <ShopProductGrid
            key={queryString || "default"}
            initialPage={initialPage}
            queryString={queryString}
            loadMorePath={`/api/collections/${encodeURIComponent(collection.handle)}`}
            clearHref={basePath}
          />
        </ShopControls>
      </div>
    </main>
  );
}
