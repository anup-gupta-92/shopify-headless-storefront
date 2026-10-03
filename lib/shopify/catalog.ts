import "server-only";

import { cache } from "react";
import type { CatalogFacets, CatalogFilterState, CatalogPage, CatalogSort } from "@/types/catalog";
import type { ShopifyProductSummary } from "./types";
import { storefrontRequest } from "./client";
import { SHOP_FACETS_QUERY, SHOP_PRODUCTS_QUERY } from "./queries";
import { mapProductSummary } from "./products";
import { resolveCatalogPage } from "./catalog-pagination";
import { hasPurchasableSaleVariant } from "./sale";

export const CATALOG_LOAD_MORE_PAGE_SIZE = 24;
export const SHOP_INITIAL_PAGE_SIZE = 48;
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
    onSale: readParam(source, "sale") === "1",
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
  if (filters.onSale) params.set("sale", "1");
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

interface ShopProductEdge {
  cursor: string;
  node: ShopifyProductSummary;
}

interface ShopProductsResult {
  products: {
    edges: ShopProductEdge[];
    pageInfo: CatalogPage["pageInfo"];
  };
}

function eligibleProduct(
  product: ShopifyProductSummary,
  filters: CatalogFilterState,
  selectedVendors: Set<string>,
  selectedProductTypes: Set<string>,
) {
  if (filters.inStock && !product.availableForSale) return false;
  if (selectedVendors.size && !selectedVendors.has(product.vendor.trim().toLocaleLowerCase())) return false;
  if (selectedProductTypes.size && !selectedProductTypes.has(product.productType.trim().toLocaleLowerCase())) return false;
  return true;
}

async function requestCatalogProducts(filters: CatalogFilterState, first: number, after?: string | null) {
  const sort = SORT_OPTIONS[filters.sort];
  return storefrontRequest<ShopProductsResult>(SHOP_PRODUCTS_QUERY, {
    first,
    after: after || null,
    sortKey: sort.sortKey,
    reverse: sort.reverse,
    query: buildShopifyQuery(filters) || null,
  });
}

export async function getCatalogPage(filters: CatalogFilterState, after?: string): Promise<CatalogPage> {
  const pageSize = after ? CATALOG_LOAD_MORE_PAGE_SIZE : SHOP_INITIAL_PAGE_SIZE;
  const selectedVendors = new Set(filters.vendors.map((value) => value.toLocaleLowerCase()));
  const selectedProductTypes = new Set(filters.productTypes.map((value) => value.toLocaleLowerCase()));

  if (filters.onSale) {
    const saleProductIds = await getSaleProductIds();
    const products: CatalogPage["products"] = [];
    let scanCursor = after || null;
    let finalCursor: string | null = null;
    let hasNextSourcePage = true;

    // Shopify has no native compare-at-price filter. Scan its sorted cursor
    // connection until this sale-only page is full, plus one match for lookahead.
    while (hasNextSourcePage) {
      const data = await requestCatalogProducts(filters, pageSize, scanCursor);
      const edges = data.products.edges;

      for (const edge of edges) {
        scanCursor = edge.cursor;
        const product = edge.node;
        if (!saleProductIds.has(product.id)
          || !eligibleProduct(product, filters, selectedVendors, selectedProductTypes)) continue;

        if (products.length === pageSize) {
          return { products, pageInfo: { hasNextPage: true, endCursor: finalCursor } };
        }

        products.push(mapProductSummary(product));
        finalCursor = edge.cursor;
      }

      hasNextSourcePage = data.products.pageInfo.hasNextPage;
      const nextCursor = data.products.pageInfo.endCursor;
      if (hasNextSourcePage && (!nextCursor || nextCursor === scanCursor && edges.length === 0)) {
        throw new Error("Shopify sale pagination could not continue");
      }
      scanCursor = nextCursor;
    }

    return { products, pageInfo: { hasNextPage: false, endCursor: finalCursor } };
  }

  const data = await requestCatalogProducts(filters, pageSize, after);

  const seen = new Set<string>();
  const products = data.products.edges.map((edge) => edge.node).filter((product) => {
    if (seen.has(product.id) || !eligibleProduct(product, filters, selectedVendors, selectedProductTypes)) return false;
    seen.add(product.id);
    return true;
  }).map(mapProductSummary);

  return { products, pageInfo: data.products.pageInfo };
}

export function getCatalogPageByNumber(filters: CatalogFilterState, pageNumber: number): Promise<CatalogPage | null> {
  return resolveCatalogPage(pageNumber, (after) => getCatalogPage(filters, after));
}

interface FacetProduct {
  id: string;
  vendor: string;
  productType: string;
  availableForSale: boolean;
  variants: ShopifyProductSummary["variants"];
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

const getCatalogFacetProducts = cache(async (): Promise<FacetProduct[]> => {
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

  return products;
});

const getSaleProductIds = cache(async (): Promise<Set<string>> => {
  const products = await getCatalogFacetProducts();
  return new Set(products
    .filter((product) => product.availableForSale && hasPurchasableSaleVariant(product.variants.nodes))
    .map((product) => product.id));
});

export const getCatalogFacets = cache(async (): Promise<CatalogFacets> => {
  const products = await getCatalogFacetProducts();
  const availableProducts = products.filter((product) => product.availableForSale);

  return {
    availability: {
      inStock: availableProducts.length,
    },
    offers: {
      onSale: availableProducts.filter((product) => hasPurchasableSaleVariant(product.variants.nodes)).length,
    },
    vendors: countFacet(availableProducts.map((product) => product.vendor)),
    productTypes: countFacet(availableProducts.map((product) => product.productType)),
  };
});
