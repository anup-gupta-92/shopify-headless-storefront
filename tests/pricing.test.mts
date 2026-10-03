import assert from "node:assert/strict";
import test from "node:test";
import {
  formatUkPriceExcludingVat,
  getUkCartVatInclusiveBreakdown,
  getUkVatInclusiveBreakdown,
  UK_VAT_RATE,
} from "../lib/shopify/pricing.ts";

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

test("cart rounds the VAT component first for a £99.99 VAT-inclusive line", () => {
  const breakdown = getUkCartVatInclusiveBreakdown(gbp("99.99"), [gbp("99.99")]);

  assert.deepEqual(breakdown, {
    subtotalExVat: gbp("83.32"),
    vat: gbp("16.67"),
    totalIncVat: gbp("99.99"),
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

test("extracts expected VAT from verified Shopify line totals", () => {
  assert.equal(getUkVatInclusiveBreakdown(gbp("14.49"))?.vat.amount, "2.42");
  assert.equal(getUkVatInclusiveBreakdown(gbp("1.99"))?.vat.amount, "0.33");
  assert.equal(getUkVatInclusiveBreakdown(gbp("3.99"))?.vat.amount, "0.67");
});

test("sums rounded line VAT for the verified £20.47 cart", () => {
  const breakdown = getUkCartVatInclusiveBreakdown(
    gbp("20.47"),
    [gbp("14.49"), gbp("1.99"), gbp("3.99")],
  );

  assert.deepEqual(breakdown, {
    subtotalExVat: gbp("17.05"),
    vat: gbp("3.42"),
    totalIncVat: gbp("20.47"),
  });
});

test("two-line cart reconciles exactly in integer pennies", () => {
  const breakdown = getUkCartVatInclusiveBreakdown(
    gbp("16.98"),
    [gbp("11.99"), gbp("4.99")],
  );
  assert.ok(breakdown);

  const subtotalMinor = Math.round(Number(breakdown.subtotalExVat.amount) * 100);
  const vatMinor = Math.round(Number(breakdown.vat.amount) * 100);
  const totalMinor = Math.round(Number(breakdown.totalIncVat.amount) * 100);
  assert.equal(subtotalMinor + vatMinor, totalMinor);
});

test("uses the Shopify line total for a quantity greater than one", () => {
  const breakdown = getUkCartVatInclusiveBreakdown(gbp("23.98"), [gbp("23.98")]);

  assert.deepEqual(breakdown, {
    subtotalExVat: gbp("19.98"),
    vat: gbp("4.00"),
    totalIncVat: gbp("23.98"),
  });
});

test("every required cart case reconciles exactly in integer pennies", () => {
  const cases = [
    getUkCartVatInclusiveBreakdown(gbp("99.99"), [gbp("99.99")]),
    getUkCartVatInclusiveBreakdown(gbp("20.47"), [gbp("14.49"), gbp("1.99"), gbp("3.99")]),
    getUkCartVatInclusiveBreakdown(gbp("16.98"), [gbp("11.99"), gbp("4.99")]),
  ];

  for (const breakdown of cases) {
    assert.ok(breakdown);
    const subtotalMinor = Number(breakdown.subtotalExVat.amount.replace(".", ""));
    const vatMinor = Number(breakdown.vat.amount.replace(".", ""));
    const totalMinor = Number(breakdown.totalIncVat.amount.replace(".", ""));
    assert.equal(subtotalMinor + vatMinor, totalMinor);
  }
});
