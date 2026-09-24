import type { Money, ProductImage, ProductOption, QuantityRule, SelectedOption, UnitPriceMeasurement } from "@/types/product";
import type { RatingMetafields } from "@/lib/judgeme/product";

export interface ShopifyVariant {
  id: string; title: string; sku: string | null; availableForSale: boolean;
  currentlyNotInStock: boolean;
  quantityRule: QuantityRule;
  selectedOptions: SelectedOption[];
  price: Money; compareAtPrice: Money | null;
  unitPrice: Money | null; unitPriceMeasurement: UnitPriceMeasurement | null;
}
export interface VariantConnection {
  nodes: ShopifyVariant[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
export interface ShopifyProductSummary extends RatingMetafields {
  id: string; handle: string; title: string; productType: string; vendor: string; availableForSale: boolean;
  featuredImage: ProductImage | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
  variants: { nodes: Array<Pick<ShopifyVariant, "id" | "availableForSale" | "price" | "compareAtPrice">> };
}
export interface ShopifyProduct extends ShopifyProductSummary {
  description: string; descriptionHtml: string; vendor: string;
  images: { nodes: ProductImage[] }; options: ProductOption[];
  collections: { nodes: Array<{ handle: string; title: string }> };
  variants: VariantConnection;
}

export interface ShopifyCollection {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  image: ProductImage | null;
}

export interface ShopifyPolicy {
  handle: string;
  title: string;
  body: string;
  url: string;
}
