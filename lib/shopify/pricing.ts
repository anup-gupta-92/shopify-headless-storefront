import type { Money } from "@/types/product";

export const UK_VAT_RATE = 0.2;

export interface VatInclusiveBreakdown {
  subtotalExVat: Money;
  vat: Money;
  totalIncVat: Money;
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: money.currencyCode }).format(Number(money.amount));
}

export function getUkVatInclusiveBreakdown(totalIncVat: Money): VatInclusiveBreakdown | undefined {
  const amount = Number(totalIncVat.amount);
  if (!Number.isFinite(amount) || amount < 0) return undefined;

  const totalIncVatMinor = Math.round(amount * 100);
  // Extract VAT from an already VAT-inclusive price; do not add VAT to Shopify's total.
  const subtotalExVatMinor = Math.round(totalIncVatMinor / (1 + UK_VAT_RATE));
  const vatMinor = totalIncVatMinor - subtotalExVatMinor;
  const moneyFromMinor = (minor: number): Money => ({
    amount: (minor / 100).toFixed(2),
    currencyCode: totalIncVat.currencyCode,
  });

  return {
    subtotalExVat: moneyFromMinor(subtotalExVatMinor),
    vat: moneyFromMinor(vatMinor),
    totalIncVat: moneyFromMinor(totalIncVatMinor),
  };
}

export function validCompareAtPrice(current: Money | null | undefined, compareAt: Money | null | undefined): Money | undefined {
  if (!current || !compareAt || current.currencyCode !== compareAt.currencyCode) return undefined;
  const currentAmount = Number(current.amount);
  const compareAtAmount = Number(compareAt.amount);
  return Number.isFinite(currentAmount) && Number.isFinite(compareAtAmount) && compareAtAmount > currentAmount
    ? compareAt
    : undefined;
}

export function formatUkPriceExcludingVat(price: Money): string | undefined {
  // Storefront-display logic only: assumes UK GBP prices include 20% VAT.
  // Validate against the actual Shopify tax configuration and product tax rates
  // before launch. This does not affect Shopify prices, taxes, or checkout.
  if (price.currencyCode !== "GBP") return undefined;
  const breakdown = getUkVatInclusiveBreakdown(price);
  return breakdown ? formatMoney(breakdown.subtotalExVat) : undefined;
}
