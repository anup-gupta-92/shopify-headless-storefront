import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateBulkOrder,
  getPackValueSavings,
  type BulkMatrixRow,
  type BulkOrderModel,
} from "../lib/shopify/bulk-order.ts";
import type { ProductVariant } from "../types/product.ts";

function variant(id: string, amount: string, overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: `Variant ${id}`,
    price: `£${amount}`,
    money: { amount, currencyCode: "GBP" },
    available: true,
    ...overrides,
  };
}

function packRow(key: string, entries: Array<{
  pack: string;
  amount: string;
  id?: string;
  overrides?: Partial<ProductVariant>;
}>): BulkMatrixRow {
  return {
    key,
    label: key,
    cells: entries.map(({ pack, amount, id = `${key}-${pack}`, overrides }) => ({
      columnValue: pack,
      variant: variant(id, amount, overrides),
    })),
  };
}

function packModel(rows: BulkMatrixRow[], mode: "matrix" | "quantity_only" = rows.length === 1 ? "quantity_only" : "matrix"): BulkOrderModel {
  return {
    mode,
    productTitle: "Pack product",
    rowOptionName: mode === "matrix" ? "Size" : "Variant",
    columnOptionName: "Pack of",
    columnValues: [...new Set(rows.flatMap((row) => row.cells.map((cell) => cell.columnValue)))],
    rows,
    variants: rows.flatMap((row) => row.cells.flatMap((cell) => cell.variant ? [cell.variant] : [])),
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

test("pack savings use the smallest same-row pack and conservative percentages", () => {
  const model = packModel([packRow("12x16", [
    { pack: "100", amount: "4.99", id: "pack-100" },
    { pack: "500", amount: "23.50", id: "pack-500" },
    { pack: "1000", amount: "46.50", id: "pack-1000" },
  ])]);
  const savings = getPackValueSavings(model);

  assert.equal(savings["gid://shopify/ProductVariant/pack-100"], undefined);
  assert.deepEqual(savings["gid://shopify/ProductVariant/pack-500"], {
    savingMinor: 145,
    percentageTenths: 58,
    baselinePackSize: 100,
    currencyCode: "GBP",
  });
  assert.deepEqual(savings["gid://shopify/ProductVariant/pack-1000"], {
    savingMinor: 340,
    percentageTenths: 68,
    baselinePackSize: 100,
    currencyCode: "GBP",
  });
  // 6.8% is truncated; rounding to 6.9% would overstate the exact 6.8136…% saving.
  assert.equal(savings["gid://shopify/ProductVariant/pack-1000"].percentageTenths, 68);
});

test("non-integral baseline ratios round monetary savings down to pence", () => {
  const model = packModel([packRow("12x16", [
    { pack: "100 - Starter Pack", amount: "4.99", id: "100" },
    { pack: "250 – Value Pack", amount: "11.99", id: "250" },
  ])]);
  const saving = getPackValueSavings(model)["gid://shopify/ProductVariant/250"];

  assert.equal(saving.savingMinor, 48); // exact saving is 48.5p
  assert.equal(saving.percentageTenths, 38);

  const twoValuePacks = evaluateBulkOrder(model, { "12x16": 500 });
  assert.deepEqual(twoValuePacks.lines, [{ merchandiseId: "gid://shopify/ProductVariant/250", quantity: 2 }]);
  assert.equal(twoValuePacks.packSavingsMinor, 97); // 2 × 48.5p, floored only after aggregation
});

test("pack baselines are row-scoped even when sizes have different prices", () => {
  const model = packModel([
    packRow("Small", [
      { pack: "100", amount: "1.99", id: "small-100" },
      { pack: "500", amount: "7.90", id: "small-500" },
    ]),
    packRow("Large", [
      { pack: "100", amount: "4.99", id: "large-100" },
      { pack: "500", amount: "23.50", id: "large-500" },
    ]),
  ]);
  const savings = getPackValueSavings(model);

  assert.equal(savings["gid://shopify/ProductVariant/small-500"].savingMinor, 205);
  assert.equal(savings["gid://shopify/ProductVariant/large-500"].savingMinor, 145);
});

test("pack ordering, missing middle packs, and unavailable baselines are handled dynamically", () => {
  const unsorted = packModel([packRow("row", [
    { pack: "1000", amount: "46.50", id: "1000" },
    { pack: "100", amount: "4.99", id: "100" },
    { pack: "500", amount: "23.50", id: "500" },
  ])]);
  assert.equal(getPackValueSavings(unsorted)["gid://shopify/ProductVariant/1000"].baselinePackSize, 100);

  const missingMiddle = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100" },
    { pack: "1000", amount: "46.50", id: "1000" },
  ])]);
  assert.equal(getPackValueSavings(missingMiddle)["gid://shopify/ProductVariant/1000"].savingMinor, 340);

  const unavailableSmallest = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100", overrides: { available: false } },
    { pack: "250", amount: "11.99", id: "250" },
    { pack: "500", amount: "23.00", id: "500" },
  ])]);
  const saving = getPackValueSavings(unavailableSmallest)["gid://shopify/ProductVariant/500"];
  assert.equal(saving.baselinePackSize, 250);
  assert.equal(saving.savingMinor, 98);
});

test("one pack, duplicate sizes, malformed labels, and currency mismatches make no saving claim", () => {
  assert.deepEqual(getPackValueSavings(packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "only" },
  ])])), {});
  assert.deepEqual(getPackValueSavings(packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "one" },
    { pack: "Pack of 100", amount: "4.50", id: "two" },
  ])])), {});
  assert.deepEqual(getPackValueSavings(packModel([packRow("row", [
    { pack: "Perforated", amount: "4.99", id: "bad" },
    { pack: "1.5 Kg", amount: "6.99", id: "also-bad" },
  ])])), {});
  const mixedCurrency = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "gbp" },
    { pack: "500", amount: "20.00", id: "usd", overrides: { money: { amount: "20.00", currencyCode: "USD" } } },
  ])]);
  assert.deepEqual(getPackValueSavings(mixedCurrency), {});
});

test("equal or worse per-item pricing does not produce a saving", () => {
  const model = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100" },
    { pack: "500", amount: "24.95", id: "equal" },
    { pack: "1000", amount: "50.00", id: "worse" },
  ])]);
  assert.deepEqual(getPackValueSavings(model), {});
});

test("compare-at prices never influence pack-value calculations", () => {
  const model = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100", overrides: { compareAtPrice: { amount: "7.80", currencyCode: "GBP" } } },
    { pack: "500", amount: "23.50", id: "500", overrides: { compareAtPrice: { amount: "32.90", currencyCode: "GBP" } } },
  ])]);
  assert.equal(getPackValueSavings(model)["gid://shopify/ProductVariant/500"].savingMinor, 145);
});

test("sticky pack saving scales by resolved line quantity", () => {
  const model = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100" },
    { pack: "500", amount: "23.50", id: "500" },
  ])]);
  const result = evaluateBulkOrder(model, { row: 1_000 });

  assert.deepEqual(result.lines, [{ merchandiseId: "gid://shopify/ProductVariant/500", quantity: 2 }]);
  assert.equal(result.packSavingsMinor, 290);
  assert.equal(result.discountRate, 0);
  assert.equal(result.estimatedSavingsMinor, 0);
});

test("pack solver substitution calculates saving from the final resolved variant", () => {
  const model = packModel([packRow("row", [
    { pack: "100", amount: "4.99", id: "100" },
    { pack: "500", amount: "23.50", id: "500" },
    { pack: "1000", amount: "46.50", id: "1000" },
  ])]);
  const result = evaluateBulkOrder(model, { row: 1_000 });

  assert.deepEqual(result.lines, [{ merchandiseId: "gid://shopify/ProductVariant/1000", quantity: 1 }]);
  assert.equal(result.packSavingsMinor, 340);
  assert.equal(result.totalMinor + result.packSavingsMinor, 4_990);
});

test("multi-row pack savings aggregate only from each row's resolved lines", () => {
  const model = packModel([
    packRow("Small", [
      { pack: "100", amount: "1.99", id: "small-100" },
      { pack: "500", amount: "7.90", id: "small-500" },
    ]),
    packRow("Large", [
      { pack: "100", amount: "4.99", id: "large-100" },
      { pack: "500", amount: "23.50", id: "large-500" },
    ]),
  ]);
  const result = evaluateBulkOrder(model, { Small: 500, Large: 500 });

  assert.equal(result.packSavingsMinor, 350);
  assert.deepEqual(result.lines, [
    { merchandiseId: "gid://shopify/ProductVariant/small-500", quantity: 1 },
    { merchandiseId: "gid://shopify/ProductVariant/large-500", quantity: 1 },
  ]);
});

test("an ambiguous resolved pack line suppresses the aggregate pack saving", () => {
  const model = packModel([
    packRow("Clear", [
      { pack: "100", amount: "4.99", id: "clear-100" },
      { pack: "500", amount: "23.50", id: "clear-500" },
    ]),
    packRow("Ambiguous", [
      { pack: "Perforated", amount: "1.00", id: "ambiguous" },
      { pack: "10", amount: "9.00", id: "ambiguous-10" },
    ]),
  ]);
  const result = evaluateBulkOrder(model, { Clear: 500, Ambiguous: 1 });

  assert.equal(result.lines.length, 2);
  assert.equal(result.packSavingsMinor, null);
});

test("variant-matrix keeps the existing aggregate discount behavior", () => {
  const model = simpleModel([primary]);
  model.mode = "variant_matrix";
  const result = evaluateBulkOrder(model, { [primary.id]: 10 });

  assert.equal(result.discountRate, 0.02);
  assert.equal(result.estimatedSavingsMinor, 250);
  assert.equal(result.packSavingsMinor, null);
  assert.deepEqual(result.packValueSavings, {});
});
