import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBreadcrumbList,
  buildGlobalStructuredData,
  buildProductStructuredData,
  MERCHANT_RETURN_POLICY_ID,
  serializeJsonLd,
  SHIPPING_SERVICE_ID,
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

function offerFrom(data: ReturnType<typeof buildProductStructuredData>) {
  const schema = graphNode(data, "Product")!;
  return schema.offers as Record<string, unknown>;
}

function assertOfferPolicyReferences(offer: Record<string, unknown>) {
  assert.deepEqual(offer.hasMerchantReturnPolicy, { "@id": MERCHANT_RETURN_POLICY_ID });
  assert.deepEqual(offer.shippingDetails, {
    "@type": "OfferShippingDetails",
    hasShippingService: { "@id": SHIPPING_SERVICE_ID },
  });
}

test("global schema contains one OnlineStore and one WebSite with real search action", () => {
  const data = buildGlobalStructuredData();
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  assert.equal(graph.filter((node) => node["@type"] === "OnlineStore").length, 1);
  assert.equal(graph.filter((node) => node["@type"] === "WebSite").length, 1);
  assert.match(JSON.stringify(data), /https:\/\/www\.apexbusinesssupplies\.co\.uk\/search\?q=/);
});

test("OnlineStore has a production logo and conservative merchant policies", () => {
  const data = buildGlobalStructuredData();
  const graph = data["@graph"] as Array<Record<string, unknown>>;
  const store = graph.find((node) => node["@type"] === "OnlineStore")!;
  assert.deepEqual(store.image, { "@id": "https://www.apexbusinesssupplies.co.uk/#logo" });
  assert.deepEqual(store.logo, {
    "@type": "ImageObject",
    "@id": "https://www.apexbusinesssupplies.co.uk/#logo",
    url: "https://www.apexbusinesssupplies.co.uk/images/logo-for-light.png",
    contentUrl: "https://www.apexbusinesssupplies.co.uk/images/logo-for-light.png",
    width: 500,
    height: 500,
    caption: "Apex Business Supplies logo",
  });

  const returns = store.hasMerchantReturnPolicy as Record<string, unknown>;
  assert.equal(returns.merchantReturnLink, "https://www.apexbusinesssupplies.co.uk/policies/refund-policy");
  assert.equal(returns.merchantReturnDays, 30);
  assert.equal("returnFees" in returns, false);

  const shipping = store.hasShippingService as Record<string, unknown>;
  assert.equal(shipping["@id"], SHIPPING_SERVICE_ID);
  const conditions = shipping.shippingConditions as Array<Record<string, unknown>>;
  assert.equal(conditions.length, 2);
  assert.deepEqual(conditions.map((condition) => (condition.shippingRate as Record<string, unknown>).value), [4.49, 0]);
  assert.deepEqual(conditions.map((condition) => (condition.shippingRate as Record<string, unknown>).currency), ["GBP", "GBP"]);
  assert.deepEqual(conditions.map((condition) => (condition.shippingDestination as Record<string, unknown>).addressCountry), ["GB", "GB"]);
  assert.deepEqual(conditions.map((condition) => condition.orderValue), [
    { "@type": "MonetaryAmount", maxValue: 79, currency: "GBP" },
    { "@type": "MonetaryAmount", minValue: 79.01, currency: "GBP" },
  ]);

  const handling = shipping.handlingTime as Record<string, unknown>;
  const handlingDuration = handling.duration as Record<string, unknown>;
  assert.deepEqual(handlingDuration, {
    "@type": "QuantitativeValue",
    minValue: 0,
    maxValue: 1,
    unitCode: "DAY",
  });
  for (const condition of conditions) {
    const transit = condition.transitTime as Record<string, unknown>;
    const transitDuration = transit.duration as Record<string, unknown>;
    assert.deepEqual(transitDuration, {
      "@type": "QuantitativeValue",
      minValue: 1,
      maxValue: 2,
      unitCode: "DAY",
    });
    assert.equal(
      Number(handlingDuration.maxValue) + Number(transitDuration.maxValue),
      3,
    );
  }
  assert.doesNotMatch(JSON.stringify(shipping), /addressCountry":"(?!GB)/);
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
    hasMerchantReturnPolicy: { "@id": MERCHANT_RETURN_POLICY_ID },
    shippingDetails: {
      "@type": "OfferShippingDetails",
      hasShippingService: { "@id": SHIPPING_SERVICE_ID },
    },
  });
  assert.deepEqual(schema.aggregateRating, {
    "@type": "AggregateRating",
    ratingValue: 4.8,
    reviewCount: 27,
  });
});

test("single-variant in-stock Offer references the shared UK fulfillment policies", () => {
  const offer = offerFrom(buildProductStructuredData(product({ variants: [variant("one", "4.99")] })));
  assert.equal(offer["@type"], "Offer");
  assert.equal(offer.priceCurrency, "GBP");
  assert.equal(offer.price, "4.99");
  assert.equal(offer.availability, "https://schema.org/InStock");
  assertOfferPolicyReferences(offer);
});

test("invalid or absent review data is omitted", () => {
  const schema = graphNode(buildProductStructuredData(product()), "Product")!;
  assert.equal("aggregateRating" in schema, false);
});

test("unavailable product emits OutOfStock rather than InStock", () => {
  const data = buildProductStructuredData(product({ variants: [variant("sold-out", "4.99", false)] }));
  const offer = offerFrom(data);
  assert.equal(offer.availability, "https://schema.org/OutOfStock");
  assertOfferPolicyReferences(offer);
});

test("product offers reference policies without duplicating MerchantReturnPolicy or international data", () => {
  const data = buildProductStructuredData(product());
  const serialized = JSON.stringify(data);
  assert.equal((serialized.match(/MerchantReturnPolicy/g) ?? []).length, 1);
  assert.equal(serialized.includes('"@type":"MerchantReturnPolicy"'), false);
  assert.equal(serialized.includes("addressCountry"), false);
  assertOfferPolicyReferences(offerFrom(data));
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
