import assert from "node:assert/strict";
import test from "node:test";
import { buildProductShareUrl } from "../lib/product-share.ts";

test("product share URL keeps only the selected variant on the canonical URL", () => {
  assert.equal(
    buildProductShareUrl(
      "https://www.apexbusinesssupplies.co.uk/products/example?analytics_preview=1&utm_source=admin#details",
      "123456",
    ),
    "https://www.apexbusinesssupplies.co.uk/products/example?variant=123456",
  );
});

test("product share URL remains clean when no variant is available", () => {
  assert.equal(
    buildProductShareUrl("https://www.apexbusinesssupplies.co.uk/products/example?analytics_preview=1"),
    "https://www.apexbusinesssupplies.co.uk/products/example",
  );
});
