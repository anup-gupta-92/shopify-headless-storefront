import type { CartAddLine } from "@/types/cart";

export const VARIANT_ID_PREFIX = "gid://shopify/ProductVariant/";
export const SELLING_PLAN_ID_PREFIX = "gid://shopify/SellingPlan/";
export const MAX_CART_LINES = 250;

export function positiveCartQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 999;
}

export function validSellingPlanId(value: unknown): value is string | undefined {
  return value === undefined
    || (typeof value === "string" && value.startsWith(SELLING_PLAN_ID_PREFIX));
}

export function normalizeCartAddLines(value: unknown): CartAddLine[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_CART_LINES) return null;
  const lines = new Map<string, CartAddLine>();

  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const line = candidate as Record<string, unknown>;
    if (
      typeof line.merchandiseId !== "string"
      || !line.merchandiseId.startsWith(VARIANT_ID_PREFIX)
      || !positiveCartQuantity(line.quantity)
      || !validSellingPlanId(line.sellingPlanId)
    ) return null;

    const key = `${line.merchandiseId}\0${line.sellingPlanId ?? ""}`;
    const quantity = (lines.get(key)?.quantity ?? 0) + line.quantity;
    if (!positiveCartQuantity(quantity)) return null;
    lines.set(key, {
      merchandiseId: line.merchandiseId,
      quantity,
      ...(line.sellingPlanId ? { sellingPlanId: line.sellingPlanId } : {}),
    });
  }

  return [...lines.values()];
}
