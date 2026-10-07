import type { Money, SellingPlanAllocation } from "@/types/product";
import { compareMoney, moneyAmountToMinorUnits } from "./pricing.ts";

export function sellingPlanOptionLabel(allocation: SellingPlanAllocation): string {
  const values = allocation.sellingPlan.options
    .map((option) => option.value.trim())
    .filter(Boolean);
  return values.join(" · ") || allocation.sellingPlan.name;
}

export function sellingPlanSavingsPercent(
  oneTimePrice: Money | undefined,
  subscriptionPrice: Money | undefined,
): number | undefined {
  if (!oneTimePrice || !subscriptionPrice || compareMoney(subscriptionPrice, oneTimePrice) !== -1) {
    return undefined;
  }

  const oneTimeMinor = moneyAmountToMinorUnits(oneTimePrice.amount);
  const subscriptionMinor = moneyAmountToMinorUnits(subscriptionPrice.amount);
  if (!oneTimeMinor || subscriptionMinor === undefined) return undefined;

  const percentage = Math.round(((oneTimeMinor - subscriptionMinor) * 100) / oneTimeMinor);
  return percentage > 0 ? percentage : undefined;
}

export function selectedSellingPlanAllocation(
  allocations: SellingPlanAllocation[] | undefined,
  sellingPlanId: string | null,
): SellingPlanAllocation | undefined {
  if (!allocations?.length) return undefined;
  return allocations.find((allocation) => allocation.sellingPlan.id === sellingPlanId)
    ?? allocations[0];
}
