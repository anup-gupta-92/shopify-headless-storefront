import "server-only";

import { cache } from "react";
import type { CatalogFacets, CatalogFilterState, CatalogPage, CatalogSort } from "@/types/catalog";
import { countFacet, SHOP_PAGE_SIZE } from "./catalog";
import { storefrontRequest } from "./client";
import { mapProductSummary } from "./products";
import { COLLECTION_FACETS_QUERY, COLLECTION_PRODUCTS_QUERY, COLLECTION_QUERY } from "./queries";
import type { ShopifyCollection, ShopifyProductSummary } from "./types";

const COLLECTION_FACET_PAGE_SIZE = 250;

const COLLECTION_SORT_OPTIONS: Record<CatalogSort, { sortKey: string; reverse: boolean }> = {
  "best-selling": { sortKey: "BEST_SELLING", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  "title-asc": { sortKey: "TITLE", reverse: false },
  newest: { sortKey: "CREATED", reverse: true },
};

type CollectionProductFilter =
  | { available: boolean }
  | { productVendor: string }
  | { price: { min?: number; max?: number } };

interface CollectionProductsResult {
  collection: {
    products: {
      nodes: ShopifyProductSummary[];
      pageInfo: CatalogPage["pageInfo"];
    };
  } | null;
}

interface CollectionFacetProduct {
  id: string;
  vendor: string;
  availableForSale: boolean;
}

interface CollectionFacetsResult {
  collection: {
    products: {
      nodes: CollectionFacetProduct[];
      pageInfo: { hasNextPage: boolean; endCursor: string | null };
    };
  } | null;
}

function collectionProductFilters(filters: CatalogFilterState): CollectionProductFilter[] {
  const productFilters: CollectionProductFilter[] = [{ available: true }];
  for (const vendor of filters.vendors) productFilters.push({ productVendor: vendor });

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    productFilters.push({
      price: {
        ...(filters.minPrice !== undefined ? { min: filters.minPrice } : {}),
        ...(filters.maxPrice !== undefined ? { max: filters.maxPrice } : {}),
      },
    });
  }

  return productFilters;
}

export const getCollectionByHandle = cache(async (handle: string): Promise<ShopifyCollection | null> => {
  const data = await storefrontRequest<{ collection: ShopifyCollection | null }>(COLLECTION_QUERY, { handle });
  return data.collection;
});

export async function getCollectionPage(
  handle: string,
  filters: CatalogFilterState,
  after?: string,
): Promise<CatalogPage | null> {
  const sort = COLLECTION_SORT_OPTIONS[filters.sort];
  const data = await storefrontRequest<CollectionProductsResult>(COLLECTION_PRODUCTS_QUERY, {
    handle,
    first: SHOP_PAGE_SIZE,
    after: after || null,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
    filters: collectionProductFilters(filters),
  });
  if (!data.collection) return null;

  const selectedVendors = new Set(filters.vendors.map((value) => value.trim().toLocaleLowerCase()));
  const seen = new Set<string>();
  const products = data.collection.products.nodes
    .filter((product) => {
      if (!product.availableForSale || seen.has(product.id)) return false;
      if (selectedVendors.size && !selectedVendors.has(product.vendor.trim().toLocaleLowerCase())) return false;
      seen.add(product.id);
      return true;
    })
    .map(mapProductSummary);

  return { products, pageInfo: data.collection.products.pageInfo };
}

export const getCollectionFacets = cache(async (handle: string): Promise<CatalogFacets | null> => {
  const products: CollectionFacetProduct[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: CollectionFacetsResult = await storefrontRequest<CollectionFacetsResult>(COLLECTION_FACETS_QUERY, {
      handle,
      first: COLLECTION_FACET_PAGE_SIZE,
      after,
    });
    if (!data.collection) return null;

    products.push(...data.collection.products.nodes);
    hasNextPage = data.collection.products.pageInfo.hasNextPage;
    const nextCursor: string | null = data.collection.products.pageInfo.endCursor;
    if (hasNextPage && (!nextCursor || nextCursor === after)) {
      throw new Error("Shopify collection facet pagination could not continue");
    }
    after = nextCursor;
  }

  const availableProducts = products.filter((product) => product.availableForSale);
  return {
    availability: { inStock: availableProducts.length },
    vendors: countFacet(availableProducts.map((product) => product.vendor)),
    productTypes: [],
  };
});
