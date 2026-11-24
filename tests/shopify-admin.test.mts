import assert from "node:assert/strict";
import test from "node:test";
import {
  parseShopifyAdminAccessToken,
  shopifyAdminTokenIsUsable,
} from "../lib/shopify/admin-auth-shared.ts";
import {
  parseShopifyAdminOrders,
  SHOPIFY_ORDER_MATCH_DEFAULT_WINDOW_SECONDS,
  SHOPIFY_ORDER_MATCH_LIMIT,
  SHOPIFY_RECENT_ORDERS_QUERY,
  shopifyOrderCreatedAtSearch,
} from "../lib/shopify/admin-orders-shared.ts";
import {
  formatOrderMatchDifference,
  parseShopifyOrderMatchRequest,
  selectCheckoutStart,
  sortOrdersByCheckoutProximity,
} from "../lib/analytics/shopify-order-matching.ts";

test("Admin access tokens honor read_orders and refresh before Shopify expiry", () => {
  const now = Date.parse("2026-11-24T10:00:00Z");
  const token = parseShopifyAdminAccessToken({
    access_token: "temporary-admin-token",
    scope: "read_orders",
    expires_in: 86_399,
  }, now);
  assert.deepEqual(token.scopes, ["read_orders"]);
  assert.equal(token.expiresAtMs, now + 86_399_000);
  assert.equal(shopifyAdminTokenIsUsable(token, token.refreshAtMs - 1), true);
  assert.equal(shopifyAdminTokenIsUsable(token, token.refreshAtMs), false);
  assert.doesNotMatch(JSON.stringify(token.scopes), /temporary-admin-token/);
});

test("Admin access tokens without read_orders are rejected", () => {
  assert.throws(() => parseShopifyAdminAccessToken({
    access_token: "temporary-admin-token",
    scope: "read_products",
    expires_in: 86_399,
  }), /shopify_admin_read_orders_scope_missing/);
});

test("order windows are server-generated, bounded and use UTC instants", () => {
  const start = Date.parse("2026-11-24T10:00:00Z") / 1_000;
  const search = shopifyOrderCreatedAtSearch(start, start + SHOPIFY_ORDER_MATCH_DEFAULT_WINDOW_SECONDS);
  assert.equal(search, "created_at:>='2026-11-24T10:00:00.000Z' created_at:<='2026-11-24T12:00:00.000Z'");
  assert.throws(() => shopifyOrderCreatedAtSearch(start, start + 86_401), /shopify_order_window_too_large/);
});

test("the prepared order query is read-only, bounded and excludes customer data", () => {
  assert.match(SHOPIFY_RECENT_ORDERS_QUERY, /^\s*query\b/);
  assert.equal(SHOPIFY_ORDER_MATCH_LIMIT, 50);
  assert.doesNotMatch(SHOPIFY_RECENT_ORDERS_QUERY, /\bmutation\b|\bcustomer\b|\bemail\b|\bphone\b|\baddress\b/i);
  assert.match(SHOPIFY_RECENT_ORDERS_QUERY, /displayFinancialStatus/);
  assert.match(SHOPIFY_RECENT_ORDERS_QUERY, /lineItems/);
  assert.match(SHOPIFY_RECENT_ORDERS_QUERY, /variantTitle/);
  assert.doesNotMatch(SHOPIFY_RECENT_ORDERS_QUERY, /\bvariant\s*\{/);
});

test("order responses retain only the fields required for analytics review", () => {
  const result = parseShopifyAdminOrders({
    orders: {
      nodes: [{
        id: "gid://shopify/Order/123",
        name: "#1662",
        createdAt: "2026-11-20T12:44:00Z",
        displayFinancialStatus: "PAID",
        totalPriceSet: { shopMoney: { amount: "78.48", currencyCode: "GBP" } },
        lineItems: {
          nodes: [{
            name: "Grey Mailing Bags - 14x21-inch",
            quantity: 2,
            sku: "GREY-1421",
            variantTitle: "14x21-inch",
          }],
          pageInfo: { hasNextPage: false },
        },
        email: "must-not-be-mapped@example.com",
      }],
      pageInfo: { hasNextPage: false },
    },
  });
  assert.deepEqual(result, {
    orders: [{
      id: "gid://shopify/Order/123",
      name: "#1662",
      createdAt: "2026-11-20T12:44:00Z",
      createdAtSeconds: Date.parse("2026-11-20T12:44:00Z") / 1_000,
      financialStatus: "PAID",
      totalAmount: "78.48",
      currencyCode: "GBP",
      lines: [{
        name: "Grey Mailing Bags - 14x21-inch",
        quantity: 2,
        sku: "GREY-1421",
        variantId: null,
        variantTitle: "14x21-inch",
      }],
      linesTruncated: false,
    }],
    ordersTruncated: false,
  });
  assert.doesNotMatch(JSON.stringify(result), /must-not-be-mapped/);
});

test("order matching accepts only supported windows and real checkout event IDs", () => {
  assert.deepEqual(parseShopifyOrderMatchRequest({ orderWindow: "6", checkoutEvent: "checkout-1" }), {
    checkoutEventId: "checkout-1",
    windowHours: 6,
  });
  assert.deepEqual(parseShopifyOrderMatchRequest({ orderWindow: "48", checkoutEvent: "x".repeat(129) }), {
    checkoutEventId: null,
    windowHours: 2,
  });

  const checkoutEvents = [
    { eventId: "checkout-1", occurredAt: 100 },
    { eventId: "checkout-2", occurredAt: 200 },
  ];
  assert.deepEqual(selectCheckoutStart(checkoutEvents, "checkout-1"), checkoutEvents[0]);
  assert.deepEqual(selectCheckoutStart(checkoutEvents, "not-a-real-event"), checkoutEvents[1]);
  assert.equal(selectCheckoutStart([], null), null);
});

test("possible order matches are ordered by proximity and describe elapsed time", () => {
  const parsed = parseShopifyAdminOrders({
    orders: {
      nodes: [
        {
          id: "gid://shopify/Order/later",
          name: "#later",
          createdAt: "2026-11-24T12:00:00Z",
          displayFinancialStatus: "PAID",
          totalPriceSet: { shopMoney: { amount: "10.00", currencyCode: "GBP" } },
          lineItems: { nodes: [], pageInfo: { hasNextPage: false } },
        },
        {
          id: "gid://shopify/Order/nearer",
          name: "#nearer",
          createdAt: "2026-11-24T10:15:00Z",
          displayFinancialStatus: "PAID",
          totalPriceSet: { shopMoney: { amount: "20.00", currencyCode: "GBP" } },
          lineItems: { nodes: [], pageInfo: { hasNextPage: false } },
        },
      ],
      pageInfo: { hasNextPage: false },
    },
  });
  const checkoutStartedAt = Date.parse("2026-11-24T10:00:00Z") / 1_000;
  assert.deepEqual(
    sortOrdersByCheckoutProximity(parsed.orders, checkoutStartedAt).map((order) => order.name),
    ["#nearer", "#later"],
  );
  assert.equal(formatOrderMatchDifference(checkoutStartedAt, checkoutStartedAt + 15 * 60), "15 mins after checkout start");
  assert.equal(formatOrderMatchDifference(checkoutStartedAt, checkoutStartedAt + 2 * 60 * 60), "2h after checkout start");
});
