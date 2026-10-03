import assert from "node:assert/strict";
import test from "node:test";
import { hasPurchasableSaleVariant } from "../lib/shopify/sale.ts";

const money = (amount: string, currencyCode = "GBP") => ({ amount, currencyCode });
const variant = (
  price: string,
  compareAtPrice: string | null,
  availableForSale = true,
) => ({
  availableForSale,
  price: money(price),
  compareAtPrice: compareAtPrice === null ? null : money(compareAtPrice),
});

test("a product is on sale when a purchasable variant has a higher compare-at price", () => {
  assert.equal(hasPurchasableSaleVariant([
    variant("8.00", null),
    variant("7.99", "9.99"),
  ]), true);
});

test("equal, lower, missing and unavailable compare-at prices are not sales", () => {
  assert.equal(hasPurchasableSaleVariant([
    variant("8.00", "8.00"),
    variant("8.00", "7.99"),
    variant("8.00", null),
    variant("8.00", "9.99", false),
  ]), false);
});

test("sale comparison requires matching currencies and finite prices", () => {
  assert.equal(hasPurchasableSaleVariant([{
    availableForSale: true,
    price: money("8.00", "GBP"),
    compareAtPrice: money("9.99", "USD"),
  }]), false);
  assert.equal(hasPurchasableSaleVariant([variant("invalid", "9.99")]), false);
});
