import test from "node:test";
import assert from "node:assert/strict";
import {
  ANALYTICS_MAX_PROPERTIES_BYTES,
  ANALYTICS_SESSION_TIMEOUT_MS,
  classifyAcquisition,
  isSessionExpired,
  shouldCollectAnalytics,
} from "../lib/analytics/first-party-shared.ts";
import { validateAnalyticsBatch, validateConsentAggregate } from "../lib/analytics/validation.ts";

const now = 1_800_000_000;

function batch(event: Record<string, unknown>) {
  return {
    session: {
      sessionId: "session-1", visitorId: "visitor-1", startedAt: now - 10, lastSeenAt: now,
      hasClickId: 0, isPwa: 0, deviceType: "desktop", initialTheme: "light",
      currentTheme: "light", themeSource: "default_system",
    },
    events: [{ eventId: "event-1", eventName: "page_view", occurredAt: now, ...event }],
  };
}

test("behavioural analytics requires consent and respects internal exclusion", () => {
  assert.equal(shouldCollectAnalytics({ hostname: "www.apexbusinesssupplies.co.uk", localEnabled: false, analyticsConsent: false, internallyExcluded: false }), false);
  assert.equal(shouldCollectAnalytics({ hostname: "www.apexbusinesssupplies.co.uk", localEnabled: false, analyticsConsent: true, internallyExcluded: true }), false);
  assert.equal(shouldCollectAnalytics({ hostname: "www.apexbusinesssupplies.co.uk", localEnabled: false, analyticsConsent: true, internallyExcluded: false }), true);
});

test("localhost is isolated unless local collection is explicitly enabled", () => {
  assert.equal(shouldCollectAnalytics({ hostname: "localhost", localEnabled: false, analyticsConsent: true, internallyExcluded: false }), false);
  assert.equal(shouldCollectAnalytics({ hostname: "localhost", localEnabled: true, analyticsConsent: true, internallyExcluded: false }), true);
});

test("session inactivity expires at 30 minutes", () => {
  assert.equal(isSessionExpired(10_000, 10_000 + ANALYTICS_SESSION_TIMEOUT_MS - 1), false);
  assert.equal(isSessionExpired(10_000, 10_000 + ANALYTICS_SESSION_TIMEOUT_MS), true);
});

test("valid session and add_to_cart event preserve integer minor units and subscription properties", () => {
  const parsed = validateAnalyticsBatch(batch({
    eventName: "add_to_cart", sourceSurface: "product_page", quantity: 2, valueMinor: 2598, currency: "gbp",
    properties: { purchase_type: "subscription", selling_plan_id: "gid://shopify/SellingPlan/1", selling_plan_name: "Every 4 weeks" },
  }), now);
  assert.equal(parsed.events[0].valueMinor, 2598);
  assert.equal(parsed.events[0].currency, "GBP");
  assert.equal(parsed.events[0].properties?.purchase_type, "subscription");
});

test("theme_changed structure is accepted", () => {
  const parsed = validateAnalyticsBatch(batch({ eventName: "theme_changed", sourceSurface: "header", properties: { from: "light", to: "dark", trigger: "header_toggle" } }), now);
  assert.equal(parsed.events[0].eventName, "theme_changed");
});

test("search query and result count are validated", () => {
  const parsed = validateAnalyticsBatch(batch({ eventName: "search_performed", sourceSurface: "search_results", properties: { query: "grey mailing bags", result_count: 24 } }), now);
  assert.equal(parsed.events[0].properties?.result_count, 24);
  assert.throws(() => validateAnalyticsBatch(batch({ eventName: "search_performed", properties: { query: "x".repeat(201), result_count: 0 } }), now), /search_query_too_long/);
});

test("oversized properties, invalid events and source surfaces are rejected", () => {
  assert.throws(() => validateAnalyticsBatch(batch({ properties: { value: "x".repeat(ANALYTICS_MAX_PROPERTIES_BYTES) } }), now), /properties_too_large/);
  assert.throws(() => validateAnalyticsBatch(batch({ eventName: "made_up" }), now), /unsupported_event/);
  assert.throws(() => validateAnalyticsBatch(batch({ sourceSurface: "footer_magic" }), now), /invalid_source_surface/);
});

test("anonymous rejected consent is valid without a visitor or session", () => {
  assert.deepEqual(validateConsentAggregate({ decision: "rejected", analyticsAllowed: false, marketingAllowed: false, action: "initial" }), {
    decision: "rejected", analyticsAllowed: 0, marketingAllowed: 0, action: "initial",
  });
  assert.throws(() => validateConsentAggregate({ decision: "accepted", analyticsAllowed: false, marketingAllowed: false, action: "initial" }), /invalid_consent_decision/);
  assert.throws(() => validateConsentAggregate({ decision: "custom", analyticsAllowed: true, marketingAllowed: true, action: "changed" }), /invalid_consent_decision/);
});

test("attribution is evidence-based", () => {
  assert.equal(classifyAcquisition({}), "direct");
  assert.equal(classifyAcquisition({ referrerHost: "www.google.co.uk" }), "organic_search");
  assert.equal(classifyAcquisition({ hasGoogleClickId: true }), "paid_search");
  assert.equal(classifyAcquisition({ utmMedium: "shopping" }), "google_shopping");
  assert.equal(classifyAcquisition({ hasMerchantClickId: true }), "google_merchant");
  assert.equal(classifyAcquisition({ referrerHost: "chatgpt.com" }), "ai_referral");
});

test("session attribution and click-ID state are constrained before D1", () => {
  assert.throws(() => validateAnalyticsBatch({ ...batch({}), session: { ...batch({}).session, acquisitionChannel: "invented" } }, now), /invalid_acquisition_channel/);
  assert.throws(() => validateAnalyticsBatch({ ...batch({}), session: { ...batch({}).session, hasClickId: 1 } }, now), /invalid_click_id_state/);
  assert.throws(() => validateAnalyticsBatch({ ...batch({}), session: { ...batch({}).session, hasClickId: 1, clickIdType: "raw-value" } }, now), /invalid_click_id_type/);
});
