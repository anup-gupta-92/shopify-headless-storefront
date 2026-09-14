export interface ProductVariant {
  id: string;
  title: string;
  price: string;
  priceExVat?: string;
  productCode?: string;
  unitPrice?: string;
  available?: boolean;
}

export interface Product {
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
