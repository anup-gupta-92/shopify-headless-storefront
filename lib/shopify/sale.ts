import type { Money } from "@/types/product";

interface SaleVariant {
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
}

export function hasPurchasableSaleVariant(variants: readonly SaleVariant[]): boolean {
  return variants.some((variant) => {
    if (!variant.availableForSale || !variant.compareAtPrice) return false;
    if (variant.price.currencyCode !== variant.compareAtPrice.currencyCode) return false;

    const price = Number(variant.price.amount);
    const compareAtPrice = Number(variant.compareAtPrice.amount);
    return Number.isFinite(price) && Number.isFinite(compareAtPrice) && compareAtPrice > price;
  });
}
