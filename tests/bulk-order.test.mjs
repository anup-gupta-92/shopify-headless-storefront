import assert from "node:assert/strict";
import test from "node:test";
import {
  SIMPLE_TIER_STEPS,
  buildLargestPackCombination,
  createBulkOrderModel,
  determineBulkOrderMode,
  discountedUnitMinor,
  evaluateBulkOrder,
  getBulkDiscountRate,
  getInventoryLimit,
  isQuantityOptionName,
  parsePackSize,
} from "../lib/shopify/bulk-order.ts";

function variant(id, title, overrides = {}) {
  return {
    id,
    title,
    price: "£1.00",
    money: { amount: "1.00", currencyCode: "GBP" },
    available: true,
    quantityRule: { minimum: 1, maximum: null, increment: 1 },
    ...overrides,
  };
}

function combination(quantity, sizes) {
  return buildLargestPackCombination(quantity, sizes.map((size) => ({
    variant: variant(`variant-${size}`, `${size} pack`),
    packSize: size,
    inventoryLimit: null,
  })));
}

test("detects legacy quantity option terms", () => {
  for (const label of ["Quantity", "Pack of", "100 pcs", "Boxes", "Qty", "Pairs", "Cloths"]) {
    assert.equal(isQuantityOptionName(label), true, label);
  }
  assert.equal(isQuantityOptionName("Size"), false);
});

test("translates the four legacy product shapes into modes", () => {
  const variants = [variant("one", "One"), variant("two", "Two")];
  assert.equal(determineBulkOrderMode({ options: [{ name: "Quantity", values: ["1", "10"] }], variants }), "quantity_only");
  assert.equal(determineBulkOrderMode({ options: [{ name: "Size", values: ["S"] }, { name: "Pack", values: ["1", "10"] }], variants }), "matrix");
  assert.equal(determineBulkOrderMode({ options: [{ name: "Colour", values: ["Blue"] }, { name: "Size", values: ["S", "M"] }], variants }), "variant_matrix");
  assert.equal(determineBulkOrderMode({ options: [{ name: "Size", values: ["S", "M"] }], variants }), "simple");
});

test("keeps the simple tier click increments at 1, 10, and 20", () => {
  assert.deepEqual([...SIMPLE_TIER_STEPS], [1, 10, 20]);
});

test("parses the first positive pack quantity", () => {
  assert.equal(parsePackSize("1 Box"), 1);
  assert.equal(parsePackSize("10 Box"), 10);
  assert.equal(parsePackSize("Pack of 50"), 50);
  assert.equal(parsePackSize("100 pcs"), 100);
  assert.equal(parsePackSize("Box"), 1);
});

test("builds largest-pack-first exact combinations", () => {
  assert.deepEqual(combination(10, [10, 1]).items.map((item) => [item.packSize, item.quantity]), [[10, 1]]);
  assert.deepEqual(combination(11, [10, 1]).items.map((item) => [item.packSize, item.quantity]), [[10, 1], [1, 1]]);
  assert.deepEqual(combination(21, [10, 1]).items.map((item) => [item.packSize, item.quantity]), [[10, 2], [1, 1]]);
  assert.deepEqual(combination(16, [10, 6]).items.map((item) => [item.packSize, item.quantity]), [[10, 1], [6, 1]]);
  assert.equal(combination(7, [10, 6]).valid, false);
});

test("backtracks when greedy largest-pack selection cannot finish exactly", () => {
  assert.deepEqual(combination(12, [8, 6]).items.map((item) => [item.packSize, item.quantity]), [[6, 2]]);
});

test("respects known inventory while finding another exact combination", () => {
  const result = buildLargestPackCombination(20, [
    { variant: variant("ten", "10 pack"), packSize: 10, inventoryLimit: 1 },
    { variant: variant("five", "5 pack"), packSize: 5, inventoryLimit: null },
  ]);
  assert.deepEqual(result.items.map((item) => [item.packSize, item.quantity]), [[10, 1], [5, 2]]);
});

test("applies the display discount thresholds and upward penny rounding", () => {
  assert.equal(getBulkDiscountRate(9), 0);
  assert.equal(getBulkDiscountRate(10), 0.02);
  assert.equal(getBulkDiscountRate(19), 0.02);
  assert.equal(getBulkDiscountRate(20), 0.03);
  assert.equal(discountedUnitMinor(299, 0.02), 294);
});

test("does not cap available backorder variants at zero", () => {
  const backorder = variant("backorder", "10 pack", { currentlyNotInStock: true, quantityAvailable: 0 });
  assert.equal(getInventoryLimit(backorder), null);
  const result = buildLargestPackCombination(10, [{
    variant: backorder,
    packSize: 10,
    inventoryLimit: getInventoryLimit(backorder),
  }]);
  assert.equal(result.valid, true);
});

test("converts a matrix desired quantity into exact Shopify variant lines", () => {
  const product = {
    title: "Boxes",
    description: "",
    image: "",
    category: "",
    price: "",
    sku: "",
    options: [
      { name: "Size", values: ["Small"] },
      { name: "Quantity", values: ["10 Box", "1 Box"] },
    ],
    variants: [
      variant("pack-10", "Small / 10 Box", { money: { amount: "99.99", currencyCode: "GBP" }, selectedOptions: [{ name: "Size", value: "Small" }, { name: "Quantity", value: "10 Box" }] }),
      variant("pack-1", "Small / 1 Box", { money: { amount: "10.99", currencyCode: "GBP" }, selectedOptions: [{ name: "Size", value: "Small" }, { name: "Quantity", value: "1 Box" }] }),
    ],
  };
  const model = createBulkOrderModel(product);
  assert.ok(model);
  const result = evaluateBulkOrder(model, { Small: 21 });
  assert.deepEqual(result.lines, [
    { merchandiseId: "pack-10", quantity: 2 },
    { merchandiseId: "pack-1", quantity: 1 },
  ]);
  assert.equal(result.selectedQuantity, 21);
  assert.equal(result.totalMinor, 21097);
  assert.equal(result.discountRate, 0);
});

test("rejects unavailable and over-stock exact variant quantities", () => {
  assert.equal(getInventoryLimit(variant("unavailable", "Unavailable", { available: false })), 0);
  assert.equal(getInventoryLimit(variant("limited", "Limited", { quantityAvailable: 3 })), 3);
});

test("variant-matrix selections remain tied to their exact Shopify variants", () => {
  const product = {
    title: "Shirts",
    description: "",
    image: "",
    category: "",
    price: "",
    sku: "",
    options: [
      { name: "Colour", values: ["Blue"] },
      { name: "Size", values: ["Small", "Large"] },
    ],
    variants: [
      variant("blue-small", "Blue / Small", { selectedOptions: [{ name: "Colour", value: "Blue" }, { name: "Size", value: "Small" }] }),
      variant("blue-large", "Blue / Large", { selectedOptions: [{ name: "Colour", value: "Blue" }, { name: "Size", value: "Large" }] }),
    ],
  };
  const model = createBulkOrderModel(product);
  assert.ok(model);
  const result = evaluateBulkOrder(model, { "blue-small": 2, "blue-large": 1 });
  assert.deepEqual(result.lines, [
    { merchandiseId: "blue-small", quantity: 2 },
    { merchandiseId: "blue-large", quantity: 1 },
  ]);
});
