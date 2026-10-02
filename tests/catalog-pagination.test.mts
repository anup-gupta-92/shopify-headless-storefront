import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogPaginationHref,
  hasCatalogSeoFilters,
  parseCatalogPageNumber,
  resolveCatalogPage,
} from "../lib/shopify/catalog-pagination.ts";

function page(products: number[], hasNextPage: boolean, endCursor: string | null) {
  return { products, pageInfo: { hasNextPage, endCursor } };
}

test("page parameters accept positive integers and default to page one", () => {
  assert.equal(parseCatalogPageNumber(undefined), 1);
  assert.equal(parseCatalogPageNumber("1"), 1);
  assert.equal(parseCatalogPageNumber("3"), 3);
  assert.equal(parseCatalogPageNumber("0"), null);
  assert.equal(parseCatalogPageNumber("2.5"), null);
  assert.equal(parseCatalogPageNumber("invalid"), null);
  assert.equal(parseCatalogPageNumber(["2", "3"]), null);
});

test("numbered pages traverse the same cursor sequence used by Load More", async () => {
  const requests: Array<string | undefined> = [];
  const pages = new Map<string | undefined, ReturnType<typeof page>>([
    [undefined, page(Array.from({ length: 48 }, (_, index) => index + 1), true, "cursor-48")],
    ["cursor-48", page(Array.from({ length: 24 }, (_, index) => index + 49), true, "cursor-72")],
    ["cursor-72", page(Array.from({ length: 24 }, (_, index) => index + 73), false, "cursor-96")],
  ]);

  const result = await resolveCatalogPage(3, async (cursor) => {
    requests.push(cursor);
    return pages.get(cursor) ?? null;
  });

  assert.deepEqual(requests, [undefined, "cursor-48", "cursor-72"]);
  assert.deepEqual(result?.products, Array.from({ length: 24 }, (_, index) => index + 73));
});

test("numbered pagination rejects pages beyond the cursor range", async () => {
  const result = await resolveCatalogPage(3, async (cursor) => (
    cursor === undefined ? page([1, 2], true, "cursor-2") : page([3], false, "cursor-3")
  ));

  assert.equal(result, null);
});

test("pagination links preserve filters while keeping page one canonical and clean", () => {
  const query = "filter.v.availability=1&filter.p.vendor=Sia+Abrasives&sort=price-asc";

  assert.equal(
    catalogPaginationHref("/shop", query, 2),
    "/shop?filter.p.vendor=Sia+Abrasives&sort=price-asc&page=2",
  );
  assert.equal(
    catalogPaginationHref("/shop", query, 1),
    "/shop?filter.p.vendor=Sia+Abrasives&sort=price-asc",
  );
  assert.equal(catalogPaginationHref("/shop", "filter.v.availability=1", 2), "/shop?page=2");
  assert.equal(hasCatalogSeoFilters("filter.v.availability=1"), false);
  assert.equal(hasCatalogSeoFilters(query), true);
});
