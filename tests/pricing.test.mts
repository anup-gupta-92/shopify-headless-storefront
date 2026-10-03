import assert from "node:assert/strict";
import test from "node:test";
import { formatUkPriceExcludingVat, getUkVatInclusiveBreakdown, UK_VAT_RATE } from "../lib/shopify/pricing.ts";

const gbp = (amount: string) => ({ amount, currencyCode: "GBP" });

test("extracts 20% VAT from a VAT-inclusive cart total in pence", () => {
  const breakdown = getUkVatInclusiveBreakdown(gbp("16.98"));

  assert.equal(UK_VAT_RATE, 0.2);
  assert.deepEqual(breakdown, {
    subtotalExVat: gbp("14.15"),
    vat: gbp("2.83"),
    totalIncVat: gbp("16.98"),
  });
});

test("rounded ex-VAT subtotal and VAT reconcile to the inclusive total", () => {
  const breakdown = getUkVatInclusiveBreakdown(gbp("11.49"));
  assert.ok(breakdown);

  const subtotalMinor = Math.round(Number(breakdown.subtotalExVat.amount) * 100);
  const vatMinor = Math.round(Number(breakdown.vat.amount) * 100);
  const totalMinor = Math.round(Number(breakdown.totalIncVat.amount) * 100);
  assert.equal(subtotalMinor + vatMinor, totalMinor);
});

test("existing ex-VAT product formatting uses the shared VAT calculation", () => {
  assert.equal(formatUkPriceExcludingVat(gbp("16.98")), "£14.15");
});
