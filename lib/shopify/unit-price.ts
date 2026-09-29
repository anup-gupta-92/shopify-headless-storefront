export interface UnitPriceMoney {
  amount: string;
  currencyCode: string;
}

export function parseReliablePackSize(label: string): number | null {
  const match = label.replaceAll(",", "").match(/\d+/);
  if (!match) return null;
  const value = Number.parseInt(match[0], 10);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function parsePackSize(label: string): number {
  return parseReliablePackSize(label) ?? 1;
}

export function formatUnitPrice(money: UnitPriceMoney): string | null {
  const amount = Number(money.amount);
  if (!Number.isFinite(amount) || amount < 0 || !money.currencyCode) return null;

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: money.currencyCode,
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    }).format(amount);
  } catch {
    return null;
  }
}

export function getBulkUnitPriceDisplay(
  variantPrice: UnitPriceMoney,
  packLabel: string | null | undefined,
  fallbackUnitPrice?: UnitPriceMoney | null,
): string | null {
  const packSize = packLabel ? parseReliablePackSize(packLabel) : null;
  const price = Number(variantPrice.amount);

  if (packSize !== null && Number.isFinite(price) && price >= 0) {
    return formatUnitPrice({
      amount: String(price / packSize),
      currencyCode: variantPrice.currencyCode,
    });
  }

  return fallbackUnitPrice ? formatUnitPrice(fallbackUnitPrice) : null;
}
