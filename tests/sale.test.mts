import assert from "node:assert/strict";
import test from "node:test";
import { compareMoney, validCompareAtPrice } from "../lib/shopify/pricing.ts";
import { getProductCardSalePricing, hasPurchasableSaleVariant } from "../lib/shopify/sale.ts";

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

const priceRange = (min: string, max = min) => ({
  minVariantPrice: money(min),
  maxVariantPrice: money(max),
});

test("single discounted variant is on sale and exposes its paired compare price", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", "15.99")],
    priceRange("12.99"),
  );
  assert.equal(pricing.hasSaleVariant, true);
  assert.equal(pricing.startingVariantIsOnSale, true);
  assert.deepEqual(pricing.startingCompareAtPrice, money("15.99"));
  assert.deepEqual(pricing.startingPrice, money("12.99"));
  assert.equal(pricing.hasPriceRange, false);
});

test("single variant without compare-at pricing is not on sale", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", null)],
    priceRange("12.99"),
  );
  assert.equal(pricing.hasSaleVariant, false);
  assert.equal(pricing.startingVariantIsOnSale, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
});

test("equal compare-at and current prices are not a sale", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", "12.99")],
    priceRange("12.99"),
  );
  assert.equal(pricing.hasSaleVariant, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
});

test("multi-variant product pairs the sale starting variant with its own compare price", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", "15.99"), variant("24.99", "29.99")],
    priceRange("12.99", "24.99"),
  );
  assert.equal(pricing.hasSaleVariant, true);
  assert.equal(pricing.startingVariantIsOnSale, true);
  assert.deepEqual(pricing.startingCompareAtPrice, money("15.99"));
  assert.deepEqual(pricing.startingPrice, money("12.99"));
  assert.equal(pricing.hasPriceRange, true);
});

test("sale on a dearer variant shows a badge but no unrelated starting compare price", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", null), variant("19.99", "24.99")],
    priceRange("12.99", "19.99"),
  );
  assert.equal(pricing.hasSaleVariant, true);
  assert.equal(pricing.startingVariantIsOnSale, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
  assert.deepEqual(pricing.startingPrice, money("12.99"));
});

test("cheaper normal variant never receives another variant's compare price", () => {
  const pricing = getProductCardSalePricing(
    [variant("12.99", "15.99"), variant("10.99", null)],
    priceRange("10.99", "12.99"),
  );
  assert.equal(pricing.hasSaleVariant, true);
  assert.equal(pricing.startingVariantIsOnSale, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
  assert.deepEqual(pricing.startingPrice, money("10.99"));
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

test("sale comparison requires matching currencies and valid decimal prices", () => {
  assert.equal(hasPurchasableSaleVariant([{
    availableForSale: true,
    price: money("8.00", "GBP"),
    compareAtPrice: money("9.99", "USD"),
  }]), false);
  assert.equal(hasPurchasableSaleVariant([variant("invalid", "9.99")]), false);
});

test("unavailable sale variants do not affect customer-facing sale state or starting price", () => {
  const pricing = getProductCardSalePricing(
    [variant("8.99", "12.99", false), variant("10.99", null, true)],
    priceRange("8.99", "10.99"),
  );
  assert.equal(pricing.hasSaleVariant, false);
  assert.equal(pricing.startingVariantIsOnSale, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
  assert.deepEqual(pricing.startingPrice, money("10.99"));
  assert.equal(pricing.hasPriceRange, false);
});

test("penny comparisons are deterministic without floating-point coercion", () => {
  assert.equal(compareMoney(money("12.990"), money("12.99")), 0);
  assert.equal(compareMoney(money("12.991"), money("12.990")), 1);
  assert.equal(compareMoney(money("0.10"), money("0.100")), 0);
  assert.deepEqual(validCompareAtPrice(money("12.99"), money("15.99")), money("15.99"));
  assert.equal(validCompareAtPrice(money("12.99"), money("12.990")), undefined);
});

test("an incomplete card connection never pairs a compare price from a different variant", () => {
  const pricing = getProductCardSalePricing(
    [variant("19.99", "24.99")],
    priceRange("12.99", "29.99"),
    false,
  );
  assert.equal(pricing.hasSaleVariant, true);
  assert.equal(pricing.startingVariantIsOnSale, false);
  assert.equal(pricing.startingCompareAtPrice, undefined);
  assert.deepEqual(pricing.startingPrice, money("12.99"));
});
