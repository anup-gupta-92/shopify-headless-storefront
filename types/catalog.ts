import type { ProductSummary } from "@/types/product";

export type CatalogSort = "best-selling" | "price-asc" | "price-desc" | "title-asc" | "newest";

export interface CatalogFilterState {
  inStock: boolean;
  onSale: boolean;
  minPrice?: number;
  maxPrice?: number;
  vendors: string[];
  productTypes: string[];
  sort: CatalogSort;
}

export interface CatalogFacets {
  availability: {
    inStock: number;
  };
  offers: {
    onSale: number;
  };
  vendors: CatalogFacetValue[];
  productTypes: CatalogFacetValue[];
}

export interface CatalogFacetValue {
  value: string;
  count: number;
}

export interface CatalogPage {
  products: ProductSummary[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}
