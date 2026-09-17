import "server-only";
import { cache } from "react";
import type { Product, ProductSummary, ProductVariant } from "@/types/product";
import { storefrontRequest } from "./client";
import { HOMEPAGE_PRODUCTS_QUERY, PRODUCT_QUERY, PRODUCT_VARIANTS_QUERY, SHOP_QUERY, PRODUCT_RECOMMENDATIONS_QUERY } from "./queries";
import { formatMoney, formatUkPriceExcludingVat } from "./pricing";
import type { ShopifyProduct, ShopifyProductSummary, ShopifyVariant, VariantConnection } from "./types";

export const HOMEPAGE_PRODUCT_LIMIT = 12;
export const HOMEPAGE_CANDIDATE_LIMIT = 36;
export const RECOMMENDATION_LIMIT = 4;

// Shopify defines availableForSale as at least one variant being purchasable.
export function eligibleProducts(products: ShopifyProductSummary[], limit: number, excludeId?: string) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (!product.availableForSale || product.id === excludeId || seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  }).slice(0, limit);
}

export const getProductRecommendations = cache(async (productId: string): Promise<ProductSummary[]> => {
  try {
    const data = await storefrontRequest<{ productRecommendations: ShopifyProductSummary[] | null }>(PRODUCT_RECOMMENDATIONS_QUERY, { productId });
    return eligibleProducts(data.productRecommendations ?? [], RECOMMENDATION_LIMIT, productId).map(mapProductSummary);
  } catch {
    // Optional recommendations must not take down the primary product page.
    console.warn("Shopify recommendations temporarily unavailable");
    return [];
  }
});

export const getShop = cache(async () => (await storefrontRequest<{ shop: { name: string } }>(SHOP_QUERY)).shop);

export function mapProductSummary(product: ShopifyProductSummary): ProductSummary {
  const min = product.priceRange.minVariantPrice;
  const max = product.priceRange.maxVariantPrice;
  const cardVariants = product.variants.nodes;
  const soleVariant = cardVariants.length === 1 ? cardVariants[0] : undefined;
  return {
    id: product.id, handle: product.handle, title: product.title,
    category: product.productType, vendor: product.vendor, available: product.availableForSale,
    image: product.featuredImage?.url ?? "", imageAlt: product.featuredImage?.altText ?? product.title,
    price: `${min.amount !== max.amount ? "From " : ""}${formatMoney(min)}`,
    currencyCode: min.currencyCode, priceRange: product.priceRange,
    cardAction: !product.availableForSale
      ? { kind: "unavailable" }
      : soleVariant?.availableForSale
        ? { kind: "add", variantId: soleVariant.id }
        : { kind: "options" },
  };
}

function mapVariant(variant: ShopifyVariant): ProductVariant {
  const measurement = variant.unitPriceMeasurement;
  const unitPrice = variant.unitPrice && measurement?.referenceUnit
    ? `${formatMoney(variant.unitPrice)} / ${measurement.referenceValue === 1 ? "" : measurement.referenceValue}${measurement.referenceUnit.toLowerCase()}`
    : undefined;
  return {
    id: variant.id, title: variant.title, productCode: variant.sku || undefined,
    available: variant.availableForSale, selectedOptions: variant.selectedOptions,
    price: formatMoney(variant.price), money: variant.price, currencyCode: variant.price.currencyCode,
    priceExVat: formatUkPriceExcludingVat(variant.price), compareAtPrice: variant.compareAtPrice ?? undefined,
    unitPrice, unitPriceMoney: variant.unitPrice ?? undefined, unitPriceMeasurement: measurement ?? undefined,
  };
}

export const getHomepageProducts = cache(async (): Promise<ProductSummary[]> => {
  const data = await storefrontRequest<{ products: { nodes: ShopifyProductSummary[] } }>(HOMEPAGE_PRODUCTS_QUERY, { first: HOMEPAGE_CANDIDATE_LIMIT });
  return eligibleProducts(data.products.nodes, HOMEPAGE_PRODUCT_LIMIT).map(mapProductSummary);
});

export const getProductByHandle = cache(async (handle: string): Promise<Product | null> => {
  const { product } = await storefrontRequest<{ product: ShopifyProduct | null }>(PRODUCT_QUERY, { handle });
  if (!product) return null;
  const normalizedProductType = product.productType.trim().toLocaleLowerCase();
  const matchingCollection = normalizedProductType
    ? product.collections.nodes.find((collection) => collection.title.trim().toLocaleLowerCase() === normalizedProductType)
    : undefined;
  const variants = [...product.variants.nodes];
  let page = product.variants.pageInfo;
  while (page.hasNextPage) {
    if (!page.endCursor) throw new Error("Shopify variant pagination returned no cursor");
    const result = await storefrontRequest<{ product: { variants: VariantConnection } | null }>(PRODUCT_VARIANTS_QUERY, { handle, after: page.endCursor });
    if (!result.product || result.product.variants.pageInfo.endCursor === page.endCursor) throw new Error("Shopify variant pagination could not continue");
    variants.push(...result.product.variants.nodes);
    page = result.product.variants.pageInfo;
  }
  return {
    ...mapProductSummary(product), description: product.description, descriptionHtml: product.descriptionHtml,
    vendor: product.vendor, images: product.images.nodes, options: product.options,
    collection: matchingCollection,
    sku: "", variants: variants.map(mapVariant),
    available: variants.length > 0 && product.availableForSale,
  };
});
