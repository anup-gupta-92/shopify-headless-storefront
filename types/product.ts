export interface Money { amount: string; currencyCode: string }
import type { ReviewRating } from "@/lib/judgeme/types";
export interface ProductImage { url: string; altText: string | null; width: number | null; height: number | null }
export interface SelectedOption { name: string; value: string }
export interface ProductOption { name: string; values: string[] }
export interface UnitPriceMeasurement {
  measuredType: string | null; quantityUnit: string | null; quantityValue: number;
  referenceUnit: string | null; referenceValue: number;
}
export interface QuantityRule {
  minimum: number;
  maximum: number | null;
  increment: number;
}
export interface ProductSummary {
  id: string; handle: string; title: string; category: string; image: string;
  reviewRating?: ReviewRating;
  imageAlt?: string; price: string; currencyCode: string; available: boolean;
  compareAtPrice?: Money;
  vendor: string;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  cardAction:
    | { kind: "add"; variantId: string }
    | { kind: "options" }
    | { kind: "unavailable" };
}

export interface ProductVariant {
  money?: Money;
  currencyCode?: string;
  compareAtPrice?: Money;
  selectedOptions?: SelectedOption[];
  unitPriceMoney?: Money;
  unitPriceMeasurement?: UnitPriceMeasurement;
  id: string;
  title: string;
  price: string;
  priceExVat?: string;
  productCode?: string;
  unitPrice?: string;
  available?: boolean;
  currentlyNotInStock?: boolean;
  /** Available only when the Storefront token has product-inventory access. */
  quantityAvailable?: number | null;
  quantityRule?: QuantityRule;
}

export interface Product {
  id?: string;
  reviewRating?: ReviewRating;
  handle?: string;
  currencyCode?: string;
  imageAlt?: string;
  descriptionHtml?: string;
  vendor?: string;
  images?: ProductImage[];
  options?: ProductOption[];
  collections?: Array<{ handle: string; title: string }>;
  title: string;
  description: string;
  image: string;
  category: string;
  price: string;
  /** Legacy identifier retained for existing catalog cards. */
  sku: string;
  productCode?: string;
  priceExVat?: string;
  unitPrice?: string;
  available?: boolean;
  variants?: ProductVariant[];
  defaultVariantId?: string;
}

export function getDefaultVariant(product: Product): ProductVariant | undefined {
  return product.variants?.find((variant) => variant.id === product.defaultVariantId)
    ?? product.variants?.find((variant) => variant.available !== false)
    ?? product.variants?.[0];
}
