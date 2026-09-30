import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBreadcrumbList,
  buildGlobalStructuredData,
  buildProductStructuredData,
  serializeJsonLd,
} from "../lib/structured-data.ts";

const variant = (id: string, amount: string, available = true, sku?: string) => ({
  id,
  title: id,
  price: `£${amount}`,
  money: { amount, currencyCode: "GBP" },
  available,
  productCode: sku,
});

const product = (overrides = {}) => ({
  id: "gid://shopify/Product/123",
  handle: "test-product",
  title: "Test Product",
  description: "A useful product.",
  image: "https://cdn.shopify.com/product.jpg",
  category: "Workplace Supplies",
  vendor: "Apex",
  price: "£4.99",
  sku: "",
  variants: [variant("one", "4.99"), variant("two", "7.99")],
  ...overrides,
});

function graphNode(data: ReturnType<typeof buildProductStructuredData>, type: string) {
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  return graph.find((node) => node["@type"] === type);
}

test("global schema contains one Organization and one WebSite with real search action", () => {
  const data = buildGlobalStructuredData();
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  assert.equal(graph.filter((node) => node["@type"] === "Organization").length, 1);
  assert.equal(graph.filter((node) => node["@type"] === "WebSite").length, 1);
  assert.match(JSON.stringify(data), /https:\/\/www\.apexbusinesssupplies\.co\.uk\/search\?q=/);
});

test("multi-variant product uses an in-stock AggregateOffer and genuine rating", () => {
  const data = buildProductStructuredData(product({ reviewRating: { average: 4.8, count: 27 } }));
  const schema = graphNode(data, "Product")!;
  assert.deepEqual(schema.offers, {
    "@type": "AggregateOffer",
    url: "https://www.apexbusinesssupplies.co.uk/products/test-product",
    priceCurrency: "GBP",
    lowPrice: "4.99",
    highPrice: "7.99",
    offerCount: 2,
    availability: "https://schema.org/InStock",
  });
  assert.deepEqual(schema.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.8,
    reviewCount: 27,
  });
});

test("invalid or absent review data is omitted", () => {
  const schema = graphNode(buildProductStructuredData(product()), "Product")!;
  assert.equal("aggregateRating" in schema, false);
});

test("unavailable product emits OutOfStock rather than InStock", () => {
  const data = buildProductStructuredData(product({ variants: [variant("sold-out", "4.99", false)] }));
  const schema = graphNode(data, "Product")!;
  assert.equal((schema.offers as Record<string, unknown>).availability, "https://schema.org/OutOfStock");
});

test("breadcrumbs use production URLs and correct positions", () => {
  const data = buildBreadcrumbList([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
  ], "https://www.apexbusinesssupplies.co.uk/shop");
  const items = data.itemListElement as Array<Record<string, unknown>>;
  assert.equal(items[0].item, "https://www.apexbusinesssupplies.co.uk/");
  assert.equal(items[1].position, 2);
});

test("JSON-LD serialization escapes script-breaking markup", () => {
  assert.equal(serializeJsonLd({ value: "</script>" }), '{"value":"\\u003c/script>"}');
});
