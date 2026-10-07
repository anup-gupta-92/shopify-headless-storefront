import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCartAddLines, validSellingPlanId } from "../lib/shopify/cart-input.ts";
import {
  selectedSellingPlanAllocation,
  sellingPlanOptionLabel,
  sellingPlanSavingsPercent,
} from "../lib/shopify/subscriptions.ts";
import type { SellingPlanAllocation } from "../types/product.ts";

const money = (amount: string) => ({ amount, currencyCode: "GBP" });
const allocation = (
  id: string,
  price: string,
  option = "Deliver every month",
): SellingPlanAllocation => ({
  sellingPlan: {
    id: `gid://shopify/SellingPlan/${id}`,
    name: option,
    groupName: "Subscribe This Product",
    options: [{ name: "Delivery frequency", value: option }],
  },
  price: money(price),
});

test("0% Shopify plans expose their actual price without a false saving", () => {
  assert.equal(sellingPlanSavingsPercent(money("12.99"), money("12.99")), undefined);
});

test("Shopify-adjusted subscription pricing produces a derived saving", () => {
  assert.equal(sellingPlanSavingsPercent(money("12.99"), money("12.73")), 2);
  assert.equal(sellingPlanSavingsPercent(money("12.99"), money("13.00")), undefined);
});

test("selling-plan resolution retains a compatible plan and safely falls back", () => {
  const plans = [allocation("1", "12.99", "Deliver every week"), allocation("2", "12.99")];
  assert.equal(selectedSellingPlanAllocation(plans, plans[1].sellingPlan.id)?.sellingPlan.id, plans[1].sellingPlan.id);
  assert.equal(selectedSellingPlanAllocation(plans, "gid://shopify/SellingPlan/missing")?.sellingPlan.id, plans[0].sellingPlan.id);
  assert.equal(selectedSellingPlanAllocation([], plans[0].sellingPlan.id), undefined);
  assert.equal(sellingPlanOptionLabel(plans[1]), "Deliver every month");
});

test("one-time and subscription purchases of the same variant remain distinct cart inputs", () => {
  const merchandiseId = "gid://shopify/ProductVariant/123";
  const sellingPlanId = "gid://shopify/SellingPlan/456";
  assert.deepEqual(normalizeCartAddLines([
    { merchandiseId, quantity: 1 },
    { merchandiseId, quantity: 2, sellingPlanId },
    { merchandiseId, quantity: 3, sellingPlanId },
  ]), [
    { merchandiseId, quantity: 1 },
    { merchandiseId, quantity: 5, sellingPlanId },
  ]);
});

test("invalid selling-plan IDs are rejected before Shopify cart mutation", () => {
  assert.equal(validSellingPlanId(undefined), true);
  assert.equal(validSellingPlanId("gid://shopify/SellingPlan/456"), true);
  assert.equal(validSellingPlanId("gid://shopify/ProductVariant/456"), false);
  assert.equal(normalizeCartAddLines([{
    merchandiseId: "gid://shopify/ProductVariant/123",
    quantity: 1,
    sellingPlanId: "not-a-plan",
  }]), null);
});
