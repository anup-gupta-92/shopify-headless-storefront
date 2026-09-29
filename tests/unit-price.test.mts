import assert from "node:assert/strict";
import test from "node:test";
import { getBulkUnitPriceDisplay } from "../lib/shopify/unit-price.ts";

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
