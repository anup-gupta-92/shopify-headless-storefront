import type { Money, ProductImage, ProductOption, SelectedOption, UnitPriceMeasurement } from "@/types/product";

export interface ShopifyVariant {
  id: string; title: string; sku: string | null; availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money; compareAtPrice: Money | null;
  unitPrice: Money | null; unitPriceMeasurement: UnitPriceMeasurement | null;
}
export interface VariantConnection {
  nodes: ShopifyVariant[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
}
export interface ShopifyProductSummary {
  id: string; handle: string; title: string; productType: string; availableForSale: boolean;
  featuredImage: ProductImage | null;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
}
export interface ShopifyProduct extends ShopifyProductSummary {
  description: string; descriptionHtml: string; vendor: string;
  images: { nodes: ProductImage[] }; options: ProductOption[];
  variants: VariantConnection;
}
