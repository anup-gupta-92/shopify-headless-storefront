import type { Money } from "@/types/product";

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: money.currencyCode }).format(Number(money.amount));
}

export function formatUkPriceExcludingVat(price: Money): string | undefined {
  // Storefront-display logic only: assumes UK GBP prices include 20% VAT.
  // Validate against the actual Shopify tax configuration and product tax rates
  // before launch. This does not affect Shopify prices, taxes, or checkout.
  if (price.currencyCode !== "GBP") return undefined;
  return formatMoney({ ...price, amount: (Number(price.amount) / 1.2).toFixed(2) });
}
