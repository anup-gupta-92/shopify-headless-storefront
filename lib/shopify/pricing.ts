import type { Money } from "@/types/product";

export const UK_VAT_RATE_PERCENT = 20;
export const UK_VAT_RATE = UK_VAT_RATE_PERCENT / 100;

export interface VatInclusiveBreakdown {
  subtotalExVat: Money;
  vat: Money;
  totalIncVat: Money;
}

export function formatMoney(money: Money): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: money.currencyCode }).format(Number(money.amount));
}

function moneyAmountToMinorUnits(amount: string): number | undefined {
  const match = /^(\d+)(?:\.(\d+))?$/.exec(amount.trim());
  if (!match) return undefined;

  const whole = Number(match[1]);
  const fraction = match[2] ?? "";
  if (!Number.isSafeInteger(whole)) return undefined;

  const hundredths = Number((fraction + "00").slice(0, 2));
  let minor = whole * 100 + hundredths;
  if (!Number.isSafeInteger(minor)) return undefined;

  // MoneyV2 cart totals normally have two decimals; round any extra precision
  // deterministically rather than passing it through binary floating point.
  if ((fraction[2] ?? "0") >= "5") minor += 1;
  return Number.isSafeInteger(minor) ? minor : undefined;
}

function includedUkVatMinor(grossMinor: number): number {
  const grossRate = 100 + UK_VAT_RATE_PERCENT;
  const includedVatDivisor = grossRate / UK_VAT_RATE_PERCENT;
  return Math.floor((grossMinor + includedVatDivisor / 2) / includedVatDivisor);
}

function moneyFromMinor(minor: number, currencyCode: string): Money {
  return {
    amount: (minor / 100).toFixed(2),
    currencyCode,
  };
}

export function getUkVatInclusiveBreakdown(totalIncVat: Money): VatInclusiveBreakdown | undefined {
  const totalIncVatMinor = moneyAmountToMinorUnits(totalIncVat.amount);
  if (totalIncVatMinor === undefined) return undefined;

  // Extract and round the VAT component first from the VAT-inclusive Shopify
  // amount. At 20%, this is gross / 6; ex VAT is the exact remainder.
  const vatMinor = includedUkVatMinor(totalIncVatMinor);
  const subtotalExVatMinor = totalIncVatMinor - vatMinor;

  return {
    subtotalExVat: moneyFromMinor(subtotalExVatMinor, totalIncVat.currencyCode),
    vat: moneyFromMinor(vatMinor, totalIncVat.currencyCode),
    totalIncVat: moneyFromMinor(totalIncVatMinor, totalIncVat.currencyCode),
  };
}

export function getUkCartVatInclusiveBreakdown(
  totalIncVat: Money,
  lineTotalsIncVat: readonly Money[],
): VatInclusiveBreakdown | undefined {
  const totalIncVatMinor = moneyAmountToMinorUnits(totalIncVat.amount);
  if (totalIncVatMinor === undefined || lineTotalsIncVat.length === 0) return undefined;

  let vatMinor = 0;
  for (const lineTotal of lineTotalsIncVat) {
    if (lineTotal.currencyCode !== totalIncVat.currencyCode) return undefined;
    const lineTotalMinor = moneyAmountToMinorUnits(lineTotal.amount);
    if (lineTotalMinor === undefined) return undefined;
    vatMinor += includedUkVatMinor(lineTotalMinor);
  }

  const subtotalExVatMinor = totalIncVatMinor - vatMinor;
  if (subtotalExVatMinor < 0) return undefined;

  return {
    subtotalExVat: moneyFromMinor(subtotalExVatMinor, totalIncVat.currencyCode),
    vat: moneyFromMinor(vatMinor, totalIncVat.currencyCode),
    totalIncVat: moneyFromMinor(totalIncVatMinor, totalIncVat.currencyCode),
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
