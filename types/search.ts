import type { ProductSummary } from "@/types/product";

export interface PredictiveSearchImage {
  url: string;
  altText: string;
}

export interface PredictiveProductResult {
  kind: "product";
  id: string;
  handle: string;
  title: string;
  href: string;
  vendor: string;
  price: string;
  available: boolean;
  image: PredictiveSearchImage | null;
}

export interface PredictiveCategoryResult {
  kind: "category";
  id: string;
  handle: string;
  title: string;
  href: string;
  image: PredictiveSearchImage | null;
}

export interface PredictiveBrandResult {
  kind: "brand";
  name: string;
  href: string;
  image: PredictiveSearchImage | null;
}

export interface PredictiveSearchPayload {
  query: string;
  products: PredictiveProductResult[];
  categories: PredictiveCategoryResult[];
  brands: PredictiveBrandResult[];
}

export interface ProductSearchPage {
  products: ProductSummary[];
  totalCount: number;
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
}
