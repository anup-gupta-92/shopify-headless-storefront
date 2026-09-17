import "server-only";

import { cache } from "react";
import type { CatalogFacets, CatalogFilterState, CatalogPage, CatalogSort } from "@/types/catalog";
import type { ShopifyProductSummary } from "./types";
import { storefrontRequest } from "./client";
import { SHOP_FACETS_QUERY, SHOP_PRODUCTS_QUERY } from "./queries";
import { mapProductSummary } from "./products";

export const SHOP_PAGE_SIZE = 24;
const SHOP_FACET_PAGE_SIZE = 250;

const SORT_OPTIONS: Record<CatalogSort, { sortKey: string; reverse: boolean }> = {
  "best-selling": { sortKey: "BEST_SELLING", reverse: false },
  "price-asc": { sortKey: "PRICE", reverse: false },
  "price-desc": { sortKey: "PRICE", reverse: true },
  "title-asc": { sortKey: "TITLE", reverse: false },
  newest: { sortKey: "CREATED_AT", reverse: true },
};

type ParamRecord = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | null | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
}

function values(source: URLSearchParams | ParamRecord, name: string): string[] {
  if (source instanceof URLSearchParams) return source.getAll(name);
  const value = source[name];
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function readParam(source: URLSearchParams | ParamRecord, name: string): string | undefined {
  return source instanceof URLSearchParams ? firstValue(source.get(name)) : firstValue(source[name]);
}

function readPreferredParam(source: URLSearchParams | ParamRecord, canonical: string, legacy: string): string | undefined {
  return readParam(source, canonical) ?? readParam(source, legacy);
}

function selectedValues(source: URLSearchParams | ParamRecord, canonical: string, legacy: string): string[] {
  const requested = values(source, canonical);
  const candidates = requested.length ? requested : values(source, legacy);
  const normalized = new Map<string, string>();
  for (const candidate of candidates) {
    const value = candidate.trim();
    if (value) normalized.set(value.toLocaleLowerCase(), value);
  }
  return [...normalized.values()].sort((a, b) => a.localeCompare(b));
}

function priceParam(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000 ? parsed : undefined;
}

export function parseCatalogParams(source: URLSearchParams | ParamRecord): CatalogFilterState {
  const requestedSort = readParam(source, "sort") as CatalogSort | undefined;
  return {
    // This storefront intentionally does not expose unavailable catalogue products.
    inStock: true,
    minPrice: priceParam(readPreferredParam(source, "filter.v.price.gte", "minPrice")),
    maxPrice: priceParam(readPreferredParam(source, "filter.v.price.lte", "maxPrice")),
    vendors: selectedValues(source, "filter.p.vendor", "vendor"),
    productTypes: selectedValues(source, "filter.p.product_type", "category"),
    sort: requestedSort && requestedSort in SORT_OPTIONS ? requestedSort : "best-selling",
  };
}

export function catalogSearchParams(filters: CatalogFilterState): URLSearchParams {
  const params = new URLSearchParams();
  params.set("filter.v.availability", filters.inStock ? "1" : "0");
  if (filters.minPrice !== undefined) params.set("filter.v.price.gte", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("filter.v.price.lte", String(filters.maxPrice));
  for (const vendor of filters.vendors) params.append("filter.p.vendor", vendor);
  for (const productType of filters.productTypes) params.append("filter.p.product_type", productType);
  if (filters.sort !== "best-selling") params.set("sort", filters.sort);
  return params;
}

function buildShopifyQuery(filters: CatalogFilterState): string {
  const terms: string[] = [];
  if (filters.inStock) terms.push("available_for_sale:true");
  const addSelection = (field: string, selected: string[]) => {
    if (!selected.length) return;
    const clauses = selected.map((value) => `${field}:${JSON.stringify(value)}`);
    terms.push(clauses.length === 1 ? clauses[0] : `(${clauses.join(" OR ")})`);
  };
  addSelection("vendor", filters.vendors);
  addSelection("product_type", filters.productTypes);
  if (filters.minPrice !== undefined) terms.push(`variants.price:>=${filters.minPrice}`);
  if (filters.maxPrice !== undefined) terms.push(`variants.price:<=${filters.maxPrice}`);
  return terms.join(" ");
}

export async function getCatalogPage(filters: CatalogFilterState, after?: string): Promise<CatalogPage> {
  const sort = SORT_OPTIONS[filters.sort];
  const data = await storefrontRequest<{
    products: {
      nodes: ShopifyProductSummary[];
      pageInfo: CatalogPage["pageInfo"];
    };
  }>(SHOP_PRODUCTS_QUERY, {
    first: SHOP_PAGE_SIZE,
    after: after || null,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
    query: buildShopifyQuery(filters) || null,
  });

  const seen = new Set<string>();
  const selectedVendors = new Set(filters.vendors.map((value) => value.toLocaleLowerCase()));
  const selectedProductTypes = new Set(filters.productTypes.map((value) => value.toLocaleLowerCase()));
  const products = data.products.nodes.filter((product) => {
    if ((filters.inStock && !product.availableForSale) || seen.has(product.id)) return false;
    if (selectedVendors.size && !selectedVendors.has(product.vendor.trim().toLocaleLowerCase())) return false;
    if (selectedProductTypes.size && !selectedProductTypes.has(product.productType.trim().toLocaleLowerCase())) return false;
    seen.add(product.id);
    return true;
  }).map(mapProductSummary);

  return { products, pageInfo: data.products.pageInfo };
}

interface FacetProduct {
  id: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
}

interface FacetProductPage {
  products: {
    nodes: FacetProduct[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

export function countFacet(values: string[]) {
  const counts = new Map<string, { value: string; count: number }>();
  for (const rawValue of values) {
    const value = rawValue.trim();
    if (!value) continue;
    const key = value.toLocaleLowerCase();
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { value, count: 1 });
  }
  return [...counts.values()].sort((a, b) => a.value.localeCompare(b.value));
}

export const getCatalogFacets = cache(async (): Promise<CatalogFacets> => {
  const products: FacetProduct[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const data: FacetProductPage = await storefrontRequest<FacetProductPage>(SHOP_FACETS_QUERY, { first: SHOP_FACET_PAGE_SIZE, after });

    products.push(...data.products.nodes);
    hasNextPage = data.products.pageInfo.hasNextPage;
    const nextCursor: string | null = data.products.pageInfo.endCursor;
    if (hasNextPage && (!nextCursor || nextCursor === after)) {
      throw new Error("Shopify facet pagination could not continue");
    }
    after = nextCursor;
  }

  return {
    availability: {
      inStock: products.filter((product) => product.availableForSale).length,
    },
    vendors: countFacet(products.filter((product) => product.availableForSale).map((product) => product.vendor)),
    productTypes: countFacet(products.filter((product) => product.availableForSale).map((product) => product.productType)),
  };
});
