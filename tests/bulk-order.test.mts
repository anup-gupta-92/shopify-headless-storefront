import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBulkOrder, type BulkOrderModel } from "../lib/shopify/bulk-order.ts";
import type { ProductVariant } from "../types/product.ts";

function variant(id: string, amount: string): ProductVariant {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: `Variant ${id}`,
    price: `£${amount}`,
    money: { amount, currencyCode: "GBP" },
    available: true,
  };
}

function simpleModel(variants: ProductVariant[]): BulkOrderModel {
  return {
    mode: "simple",
    productTitle: "Bulk product",
    rowOptionName: "Variant",
    columnOptionName: "Order",
    columnValues: [],
    variants,
    rows: variants.map((entry) => ({
      key: entry.id,
      label: entry.title,
      cells: [{ columnValue: "", variant: entry }],
    })),
  };
}

const primary = variant("1", "12.99");

test("1–9 selected units use normal pricing and have no estimated saving", () => {
  const result = evaluateBulkOrder(simpleModel([primary]), { [primary.id]: 9 });
  assert.equal(result.discountRate, 0);
  assert.equal(result.totalMinor, 11_691);
  assert.equal(result.baseTotalMinor, 11_691);
  assert.equal(result.estimatedSavingsMinor, 0);
});

test("10 and 19 selected units use the existing aggregate 2% tier", () => {
  const model = simpleModel([primary]);
  const ten = evaluateBulkOrder(model, { [primary.id]: 10 });
  const nineteen = evaluateBulkOrder(model, { [primary.id]: 19 });

  assert.equal(ten.discountRate, 0.02);
  assert.equal(ten.totalMinor, 12_740);
  assert.equal(ten.estimatedSavingsMinor, 250);
  assert.equal(nineteen.discountRate, 0.02);
  assert.equal(nineteen.totalMinor, 24_206);
  assert.equal(nineteen.estimatedSavingsMinor, 475);
});

test("20 and higher selected units use the existing aggregate 3% tier", () => {
  const model = simpleModel([primary]);
  const twenty = evaluateBulkOrder(model, { [primary.id]: 20 });
  const twentyOne = evaluateBulkOrder(model, { [primary.id]: 21 });

  assert.equal(twenty.discountRate, 0.03);
  assert.equal(twenty.baseTotalMinor, 25_980);
  assert.equal(twenty.totalMinor, 25_220);
  assert.equal(twenty.estimatedSavingsMinor, 760);
  assert.equal(twentyOne.discountRate, 0.03);
  assert.equal(twentyOne.estimatedSavingsMinor, 798);
});

test("multiple variant prices share the aggregate threshold and reconcile in pence", () => {
  const secondary = variant("2", "4.99");
  const result = evaluateBulkOrder(simpleModel([primary, secondary]), {
    [primary.id]: 5,
    [secondary.id]: 5,
  });

  assert.equal(result.selectedQuantity, 10);
  assert.equal(result.discountRate, 0.02);
  assert.equal(result.baseTotalMinor, 8_990);
  assert.equal(result.totalMinor, 8_820);
  assert.equal(result.estimatedSavingsMinor, 170);
  assert.equal(result.totalMinor + result.estimatedSavingsMinor, result.baseTotalMinor);
});
