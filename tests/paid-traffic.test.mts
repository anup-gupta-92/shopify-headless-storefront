import assert from "node:assert/strict";
import test from "node:test";
import {
  funnelRate,
  paidTrafficQueryString,
  parsePaidTrafficQuery,
} from "../lib/analytics/paid-traffic-shared.ts";
import { acquisitionChannelSql } from "../lib/analytics/first-party-shared.ts";

test("paid traffic defaults to a 30-day Paid Search cohort", () => {
  const query = parsePaidTrafficQuery({});
  assert.equal(query.range, "30d");
  assert.equal(query.acquisition, "paid_search");
  assert.equal(query.page, 1);
  assert.equal(query.countryMode, "all");
  assert.equal(query.activity, "all");
});

test("paid traffic filters are bounded and bookmarkable", () => {
  const query = parsePaidTrafficQuery({
    range: "7d",
    countryFilter: "exclude:IN",
    acquisition: "google_merchant",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "mailing bags",
    device: "mobile",
    activity: "added_to_cart",
    page: "3",
    session: "anonymous-session-id",
  });
  assert.deepEqual(query, {
    range: "7d",
    countryMode: "exclude",
    country: "IN",
    acquisition: "google_merchant",
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "mailing bags",
    device: "mobile",
    activity: "added_to_cart",
    page: 3,
    sessionId: "anonymous-session-id",
  });
  const params = new URLSearchParams(paidTrafficQueryString(query));
  assert.equal(params.get("countryFilter"), "exclude:IN");
  assert.equal(params.get("acquisition"), "google_merchant");
  assert.equal(params.get("utmCampaign"), "mailing bags");
  assert.equal(params.get("session"), "anonymous-session-id");
  assert.equal(params.get("activity"), "added_to_cart");
});

test("session activity filters are allowlisted and bookmarkable", () => {
  for (const activity of ["all", "added_to_cart", "checkout_started", "no_cart_activity"] as const) {
    const query = parsePaidTrafficQuery({ activity });
    assert.equal(query.activity, activity);
  }
  assert.equal(parsePaidTrafficQuery({ activity: "invented" }).activity, "all");
  assert.equal(new URLSearchParams(paidTrafficQueryString(parsePaidTrafficQuery({ activity: "all" }))).has("activity"), false);
});

test("all-channel comparison can be selected without inventing a channel", () => {
  const query = parsePaidTrafficQuery({ acquisition: "all" });
  assert.equal(query.acquisition, null);
  assert.equal(new URLSearchParams(paidTrafficQueryString(query)).get("acquisition"), "all");
});

test("funnel rates use a defined denominator and never divide by zero", () => {
  assert.equal(funnelRate(4, 10), 0.4);
  assert.equal(funnelRate(0, 0), null);
});

test("historical acquisition SQL uses stored evidence and a safe table alias", () => {
  const sql = acquisitionChannelSql("s");
  assert.match(sql, /click_id_type/);
  assert.match(sql, /product_sync/);
  assert.match(sql, /sag_organic/);
  assert.match(sql, /google_shopping/);
  assert.throws(() => acquisitionChannelSql("s; DROP TABLE analytics_sessions"), /invalid_analytics_sql_alias/);
});
