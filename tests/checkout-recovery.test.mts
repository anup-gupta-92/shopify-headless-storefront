import assert from "node:assert/strict";
import test from "node:test";
import {
  checkoutRecoveryRedirect,
  shopifyCheckoutRecoveryUrl,
} from "../lib/shopify/checkout-recovery.ts";

const storeDomain = "mapolishingandfinishingshop.myshopify.com";

test("checkout recovery redirects the complete opaque token to Shopify", () => {
  const token = "AA_example-token_with.url-safe~characters";
  const requestUrl = `https://www.apexbusinesssupplies.co.uk/_t/c/v3/${token}`;
  const response = checkoutRecoveryRedirect(storeDomain, requestUrl);

  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), `https://${storeDomain}/_t/c/v3/${token}`);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
});

test("checkout recovery preserves query parameters byte-for-byte", () => {
  const requestUrl = "https://www.apexbusinesssupplies.co.uk/_t/c/v3/token-123?utm_source=shopify_email&return=%2Fcheckouts%2Fabc%3Fx%3D1&flag=";

  assert.equal(
    shopifyCheckoutRecoveryUrl(storeDomain, requestUrl),
    `https://${storeDomain}/_t/c/v3/token-123?utm_source=shopify_email&return=%2Fcheckouts%2Fabc%3Fx%3D1&flag=`,
  );
});

test("checkout recovery cannot redirect back to the headless storefront", () => {
  const destination = new URL(shopifyCheckoutRecoveryUrl(
    storeDomain,
    "https://www.apexbusinesssupplies.co.uk/_t/c/v3/token-123",
  ));

  assert.equal(destination.hostname, storeDomain);
  assert.notEqual(destination.hostname, "www.apexbusinesssupplies.co.uk");
});

test("unrelated product, cart, and invalid paths are rejected by the recovery helper", () => {
  for (const pathname of [
    "/products/renaissance-wax-polish",
    "/cart",
    "/random-invalid-route",
    "/_t/c/v3/",
  ]) {
    assert.throws(
      () => shopifyCheckoutRecoveryUrl(storeDomain, `https://www.apexbusinesssupplies.co.uk${pathname}`),
      /Invalid Shopify checkout recovery path/,
    );
  }
});

test("Shopify remains responsible for the recovery endpoint's subsequent redirect", () => {
  const response = checkoutRecoveryRedirect(
    storeDomain,
    "https://www.apexbusinesssupplies.co.uk/_t/c/v3/token-123?source=recovery",
  );

  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    `https://${storeDomain}/_t/c/v3/token-123?source=recovery`,
  );
});
