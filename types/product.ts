export interface Money { amount: string; currencyCode: string }
export interface ProductImage { url: string; altText: string | null; width: number | null; height: number | null }
export interface SelectedOption { name: string; value: string }
export interface ProductOption { name: string; values: string[] }
export interface UnitPriceMeasurement {
  measuredType: string | null; quantityUnit: string | null; quantityValue: number;
  referenceUnit: string | null; referenceValue: number;
}
export interface ProductSummary {
  id: string; handle: string; title: string; category: string; image: string;
  imageAlt?: string; price: string; currencyCode: string; available: boolean;
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money };
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
}

export interface Product {
  id?: string;
  handle?: string;
  currencyCode?: string;
  imageAlt?: string;
  descriptionHtml?: string;
  vendor?: string;
  images?: ProductImage[];
  options?: ProductOption[];
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
