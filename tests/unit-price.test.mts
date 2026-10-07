import assert from "node:assert/strict";
import test from "node:test";
import { getBulkUnitPriceDisplay, parseStrictPackSize } from "../lib/shopify/unit-price.ts";

const gbp = (amount: string) => ({ amount, currencyCode: "GBP" });

test("formats £11.49 divided by 25 to three decimals", () => {
  assert.equal(getBulkUnitPriceDisplay(gbp("11.49"), "Pack of 25"), "£0.460");
});

test("formats £16.99 divided by 50 to three decimals", () => {
  assert.equal(getBulkUnitPriceDisplay(gbp("16.99"), "50 Box"), "£0.340");
});

test("formats £7.49 divided by 10 to three decimals", () => {
  assert.equal(getBulkUnitPriceDisplay(gbp("7.49"), "10 pcs"), "£0.749");
});

test("uses Shopify unit pricing when no reliable pack quantity exists", () => {
  assert.equal(getBulkUnitPriceDisplay(gbp("11.49"), "Standard box", gbp("0.34")), "£0.340");
});

test("strictly parses supported pack labels", () => {
  assert.equal(parseStrictPackSize("100"), 100);
  assert.equal(parseStrictPackSize("Pack of 500"), 500);
  assert.equal(parseStrictPackSize("1000 - Best Value"), 1000);
  assert.equal(parseStrictPackSize("10 Box"), 10);
  assert.equal(parseStrictPackSize("5 Cloths"), 5);
  assert.equal(parseStrictPackSize("Pack of 36 Rolls"), 36);
  assert.equal(parseStrictPackSize("1,000"), 1000);
});

test("strict pack parsing rejects ambiguous or malformed labels", () => {
  assert.equal(parseStrictPackSize("Perforated"), null);
  assert.equal(parseStrictPackSize("1.5 Kg"), null);
  assert.equal(parseStrictPackSize("12x16 Pack of 500"), null);
  assert.equal(parseStrictPackSize("Size 12 / 500 items"), null);
  assert.equal(parseStrictPackSize("1,00"), null);
  assert.equal(parseStrictPackSize("0"), null);
  assert.equal(parseStrictPackSize("-10"), null);
});
