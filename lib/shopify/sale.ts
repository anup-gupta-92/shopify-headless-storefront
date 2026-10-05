import type { Money } from "@/types/product";
import { compareMoney, validCompareAtPrice } from "./pricing.ts";

interface SaleVariant {
  id?: string;
  availableForSale: boolean;
  price: Money;
  compareAtPrice: Money | null;
}

export interface ProductCardSalePricing {
  hasSaleVariant: boolean;
  startingVariantIsOnSale: boolean;
  startingCompareAtPrice?: Money;
  startingPrice: Money;
  hasPriceRange: boolean;
}

export function isVariantOnSale(variant: SaleVariant): boolean {
  return variant.availableForSale && Boolean(validCompareAtPrice(variant.price, variant.compareAtPrice));
}

export function hasPurchasableSaleVariant(variants: readonly SaleVariant[]): boolean {
  return variants.some(isVariantOnSale);
}

export function getProductCardSalePricing(
  variants: readonly SaleVariant[],
  priceRange: { minVariantPrice: Money; maxVariantPrice: Money },
  variantsComplete = true,
): ProductCardSalePricing {
  const purchasableVariants = variants.filter((variant) => variant.availableForSale);
  const customerFacingVariants = purchasableVariants.length ? purchasableVariants : variants;
  let startingPrice = priceRange.minVariantPrice;
  let startingVariant: SaleVariant | undefined;
  let hasPriceRange = compareMoney(priceRange.minVariantPrice, priceRange.maxVariantPrice) !== 0;

  if (variantsComplete && customerFacingVariants.length) {
    startingVariant = customerFacingVariants.reduce((lowest, variant) => (
      compareMoney(variant.price, lowest.price) === -1 ? variant : lowest
    ));
    startingPrice = startingVariant.price;
    hasPriceRange = customerFacingVariants.some((variant) => compareMoney(variant.price, startingPrice) !== 0);
  } else {
    // Shopify's product-level range remains authoritative if a product has
    // more variants than the lightweight card connection can return.
    startingVariant = purchasableVariants.find(
      (variant) => compareMoney(variant.price, startingPrice) === 0,
    );
  }

  const startingCompareAtPrice = startingVariant
    ? validCompareAtPrice(startingVariant.price, startingVariant.compareAtPrice)
    : undefined;

  return {
    hasSaleVariant: hasPurchasableSaleVariant(purchasableVariants),
    startingVariantIsOnSale: Boolean(startingCompareAtPrice),
    startingCompareAtPrice,
    startingPrice,
    hasPriceRange,
  };
}
