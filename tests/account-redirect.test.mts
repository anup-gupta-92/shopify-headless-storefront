import assert from "node:assert/strict";
import test from "node:test";
import { GET, HEAD } from "../app/account/route.ts";

const HOSTED_ACCOUNT_URL = "https://account.apexbusinesssupplies.co.uk/";

test("account GET permanently redirects to the hosted Shopify account", () => {
  const response = GET();

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), HOSTED_ACCOUNT_URL);
});

test("account HEAD uses the same permanent redirect", () => {
  const response = HEAD();

  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), HOSTED_ACCOUNT_URL);
});
