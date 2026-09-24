import "server-only";

import { storefrontRequest } from "./client";
import { mapProductSummary } from "./products";
import { PREDICTIVE_SEARCH_QUERY, PRODUCT_SEARCH_QUERY } from "./queries";
import type { ShopifyProductSummary } from "./types";
import type { ProductImage } from "@/types/product";
import type {
  PredictiveBrandResult,
  PredictiveCategoryResult,
  PredictiveProductResult,
  PredictiveSearchImage,
  PredictiveSearchPayload,
  ProductSearchPage,
} from "@/types/search";

export const SEARCH_PAGE_SIZE = 24;
export const SEARCH_QUERY_MAX_LENGTH = 100;
export const PREDICTIVE_PRODUCT_LIMIT = 6;
export const PREDICTIVE_CATEGORY_LIMIT = 4;
export const PREDICTIVE_BRAND_LIMIT = 4;
const SHOPIFY_PREDICTIVE_LIMIT = 10;
const SEARCH_REVALIDATE_SECONDS = 60;

interface ShopifyPredictiveCollection {
  id: string;
  handle: string;
  title: string;
  image: ProductImage | null;
  availableProducts: {
    nodes: Array<{ id: string }>;
  };
}

interface PredictiveSearchResponse {
  predictiveSearch: {
    products: ShopifyProductSummary[];
    collections: ShopifyPredictiveCollection[];
  } | null;
}

interface ProductSearchResponse {
  search: {
    nodes: ShopifyProductSummary[];
    totalCount: number;
    pageInfo: ProductSearchPage["pageInfo"];
  };
}

function normalizedKey(value: string) {
  return value.trim().toLocaleLowerCase();
}

function mapImage(image: ProductImage | null, fallbackAlt: string): PredictiveSearchImage | null {
  if (!image?.url) return null;
  return { url: image.url, altText: image.altText?.trim() || fallbackAlt };
}

export function normalizeSearchQuery(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ").slice(0, SEARCH_QUERY_MAX_LENGTH);
}

export async function getPredictiveSearch(query: string): Promise<PredictiveSearchPayload> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length < 2) {
    return { query: normalizedQuery, products: [], categories: [], brands: [] };
  }

  const data = await storefrontRequest<PredictiveSearchResponse>(
    PREDICTIVE_SEARCH_QUERY,
    { query: normalizedQuery, limit: SHOPIFY_PREDICTIVE_LIMIT },
    { revalidate: SEARCH_REVALIDATE_SECONDS, tags: ["shopify-search"] },
  );
  const result = data.predictiveSearch;
  if (!result) return { query: normalizedQuery, products: [], categories: [], brands: [] };

  const seenProducts = new Set<string>();
  const products: PredictiveProductResult[] = [];
  for (const product of result.products) {
    if (!product.availableForSale || seenProducts.has(product.id)) continue;
    seenProducts.add(product.id);
    const mapped = mapProductSummary(product);
    products.push({
      kind: "product",
      id: mapped.id,
      handle: mapped.handle,
      title: mapped.title,
      href: `/products/${encodeURIComponent(mapped.handle)}`,
      vendor: mapped.vendor.trim(),
      price: mapped.price,
      available: mapped.available,
      image: mapImage(product.featuredImage, mapped.title),
    });
    if (products.length === PREDICTIVE_PRODUCT_LIMIT) break;
  }

  const seenCollections = new Set<string>();
  const categories: PredictiveCategoryResult[] = [];
  for (const collection of result.collections) {
    const key = normalizedKey(collection.handle);
    if (!key || seenCollections.has(key) || collection.availableProducts.nodes.length === 0) continue;
    seenCollections.add(key);
    categories.push({
      kind: "category",
      id: collection.id,
      handle: collection.handle,
      title: collection.title,
      href: `/collections/${encodeURIComponent(collection.handle)}`,
      image: mapImage(collection.image, collection.title),
    });
    if (categories.length === PREDICTIVE_CATEGORY_LIMIT) break;
  }

  // Vendors are not standalone Storefront API resources. An exact-title
  // collection from the same predictive response is the only reliable image
  // source currently present in this catalogue; otherwise the slot stays blank.
  const collectionImages = new Map(
    result.collections
      .filter((collection) => collection.availableProducts.nodes.length > 0)
      .map((collection) => [normalizedKey(collection.title), mapImage(collection.image, collection.title)]),
  );
  const brands: PredictiveBrandResult[] = [];
  const seenBrands = new Set<string>();
  const brandTerms = normalizedKey(normalizedQuery).split(" ").filter(Boolean);
  for (const product of result.products) {
    if (!product.availableForSale) continue;
    const name = product.vendor.trim();
    const key = normalizedKey(name);
    if (!key || seenBrands.has(key) || !brandTerms.every((term) => key.includes(term))) continue;
    seenBrands.add(key);
    const params = new URLSearchParams();
    params.set("filter.p.vendor", name);
    brands.push({
      kind: "brand",
      name,
      href: `/shop?${params.toString()}`,
      image: collectionImages.get(key) ?? null,
    });
    if (brands.length === PREDICTIVE_BRAND_LIMIT) break;
  }

  return { query: normalizedQuery, products, categories, brands };
}

export async function getProductSearchPage(query: string, after?: string): Promise<ProductSearchPage> {
  const normalizedQuery = normalizeSearchQuery(query);
  if (normalizedQuery.length < 2) {
    return { products: [], totalCount: 0, pageInfo: { hasNextPage: false, endCursor: null } };
  }

  const data = await storefrontRequest<ProductSearchResponse>(
    PRODUCT_SEARCH_QUERY,
    { query: normalizedQuery, first: SEARCH_PAGE_SIZE, after: after || null },
    { revalidate: SEARCH_REVALIDATE_SECONDS, tags: ["shopify-search"] },
  );
  const seen = new Set<string>();
  const products = data.search.nodes
    .filter((product) => {
      if (!product.availableForSale || seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    })
    .map(mapProductSummary);

  return {
    products,
    totalCount: data.search.totalCount,
    pageInfo: data.search.pageInfo,
  };
}
