import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_DISPLAY_TIME_ZONE,
  formatAnalyticsTimestamp,
} from "../lib/analytics/admin-date.ts";

test("formats an IST-observed instant in UK winter time", () => {
  assert.equal(ANALYTICS_DISPLAY_TIME_ZONE, "Europe/London");
  assert.equal(
    formatAnalyticsTimestamp(Date.parse("2026-11-09T12:44:00Z") / 1000),
    "09 Nov 2026, 12:44 GMT",
  );
});

test("formats summer timestamps using BST", () => {
  assert.equal(
    formatAnalyticsTimestamp(Date.parse("2026-07-15T11:44:00Z") / 1000),
    "15 Jul 2026, 12:44 BST",
  );
});

test("handles the UK daylight-saving transitions", () => {
  assert.equal(formatAnalyticsTimestamp(Date.parse("2026-03-29T00:59:00Z") / 1000), "29 Mar 2026, 00:59 GMT");
  assert.equal(formatAnalyticsTimestamp(Date.parse("2026-03-29T01:00:00Z") / 1000), "29 Mar 2026, 02:00 BST");
  assert.equal(formatAnalyticsTimestamp(Date.parse("2026-10-25T00:59:00Z") / 1000), "25 Oct 2026, 01:59 BST");
  assert.equal(formatAnalyticsTimestamp(Date.parse("2026-10-25T01:00:00Z") / 1000), "25 Oct 2026, 01:00 GMT");
});

test("is independent of the runtime's local timezone", () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = "Asia/Kolkata";
    const fromIndia = formatAnalyticsTimestamp(Date.parse("2026-11-09T12:44:00Z") / 1000);
    process.env.TZ = "America/Los_Angeles";
    const fromCalifornia = formatAnalyticsTimestamp(Date.parse("2026-11-09T12:44:00Z") / 1000);
    assert.equal(fromIndia, "09 Nov 2026, 12:44 GMT");
    assert.equal(fromCalifornia, fromIndia);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});
