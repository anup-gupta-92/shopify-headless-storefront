import assert from "node:assert/strict";
import test from "node:test";
import {
  cartPermalinkContext,
  cartPermalinkWasFullyCreated,
  parseCartPermalink,
  purchasableCartPermalinkLines,
} from "../lib/shopify/cart-permalink.ts";
import { shopifyCheckoutRecoveryUrl } from "../lib/shopify/checkout-recovery.ts";

const gid = (id: string) => `gid://shopify/ProductVariant/${id}`;

test("parses one Shopify numeric variant and quantity", () => {
  assert.deepEqual(parseCartPermalink("43988446183648:1"), [
    { merchandiseId: gid("43988446183648"), quantity: 1 },
  ]);
});

test("parses multiple Shopify variants without losing their quantities", () => {
  assert.deepEqual(
    parseCartPermalink("43988446183648:1,46071275585760:1,45753609617632:1"),
    [
      { merchandiseId: gid("43988446183648"), quantity: 1 },
      { merchandiseId: gid("46071275585760"), quantity: 1 },
      { merchandiseId: gid("45753609617632"), quantity: 1 },
    ],
  );
});

test("supports quantities greater than one", () => {
  assert.deepEqual(parseCartPermalink("43988446183648:5"), [
    { merchandiseId: gid("43988446183648"), quantity: 5 },
  ]);
});

test("uses only allowlisted Buy Again query context", () => {
  const context = cartPermalinkContext(new URLSearchParams(
    "attributes%5Bfrom%5D=new-customer-accounts&storefront=true&country=GB&sso=silent&redirect=https://evil.example",
  ));

  assert.deepEqual(context, {
    countryCode: "GB",
    attributes: [{ key: "from", value: "new-customer-accounts" }],
  });
});

test("rejects invalid variant IDs, quantities, and malformed paths", () => {
  for (const value of [
    "not-a-variant:1",
    "gid://shopify/ProductVariant/43988446183648:1",
    "43988446183648:nope",
    "43988446183648:0",
    "43988446183648:-1",
    "43988446183648:1000",
    "43988446183648",
    "43988446183648:1,",
    "",
  ]) {
    assert.equal(parseCartPermalink(value), null, value);
  }
});

test("combines duplicate variants without exceeding the quantity limit", () => {
  assert.deepEqual(parseCartPermalink("43988446183648:2,43988446183648:3"), [
    { merchandiseId: gid("43988446183648"), quantity: 5 },
  ]);
  assert.equal(parseCartPermalink("43988446183648:999,43988446183648:1"), null);
});

test("preserves purchasable lines while reporting unavailable or deleted variants", () => {
  const requested = parseCartPermalink(
    "43988446183648:1,46071275585760:1,45753609617632:1",
  )!;
  const result = purchasableCartPermalinkLines(
    requested,
    new Set([gid("43988446183648"), gid("45753609617632")]),
  );

  assert.deepEqual(result.lines, [requested[0], requested[2]]);
  assert.equal(result.omittedCount, 1);
});

test("detects when Shopify created fewer lines or adjusted a quantity", () => {
  const requested = parseCartPermalink("43988446183648:5,46071275585760:1")!;
  assert.equal(cartPermalinkWasFullyCreated(requested, requested), true);
  assert.equal(cartPermalinkWasFullyCreated(requested, [requested[0]]), false);
  assert.equal(cartPermalinkWasFullyCreated(requested, [
    { merchandiseId: gid("43988446183648"), quantity: 4 },
    requested[1],
  ]), false);
});

test("normal cart and checkout recovery paths remain outside cart permalink parsing", () => {
  assert.equal(parseCartPermalink(""), null);
  assert.equal(
    shopifyCheckoutRecoveryUrl(
      "mapolishingandfinishingshop.myshopify.com",
      "https://www.apexbusinesssupplies.co.uk/_t/c/v3/recovery-token?source=email",
    ),
    "https://mapolishingandfinishingshop.myshopify.com/_t/c/v3/recovery-token?source=email",
  );
});
