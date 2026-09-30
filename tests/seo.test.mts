import assert from "node:assert/strict";
import test from "node:test";
import { cleanMetadataText, conciseMetadataDescription } from "../lib/seo.ts";

test("metadata text is plain, decoded and whitespace-normalized", () => {
  assert.equal(
    cleanMetadataText("<p>Packaging &amp; <strong>PPE</strong></p>\n<p>for business</p>"),
    "Packaging & PPE for business",
  );
});

test("fallback descriptions remain concise and avoid cutting through a word", () => {
  const result = conciseMetadataDescription(
    "A long product description with usage information, industries, features, specifications and other catalogue copy that should not be dumped into a search result description.",
    "Apex Business Supplies",
    80,
  );

  assert.ok(result.length <= 80);
  assert.ok(result.endsWith("…"));
  assert.equal(result, "A long product description with usage information, industries, features,…");
});

test("empty descriptions use the site fallback", () => {
  assert.equal(conciseMetadataDescription("", "Apex Business Supplies"), "Apex Business Supplies");
});
