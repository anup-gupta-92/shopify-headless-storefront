import "server-only";

import { unstable_cache } from "next/cache";
import { analyticsDatabase } from "@/lib/analytics/server";

export const ANALYTICS_OVERVIEW_RANGES = ["today", "7d", "30d"] as const;
export type AnalyticsOverviewRange = (typeof ANALYTICS_OVERVIEW_RANGES)[number];

export type AnalyticsBreakdownItem = {
  label: string;
  count: number;
};

export type AnalyticsOverview = {
  range: AnalyticsOverviewRange;
  startAt: number;
  endAt: number;
  refreshedAt: number;
  metrics: {
    sessions: number;
    uniqueVisitors: number;
    pageViews: number;
    productViews: number;
    addToCart: number;
    checkoutStarted: number;
  };
  countries: AnalyticsBreakdownItem[];
  devices: AnalyticsBreakdownItem[];
  browsers: AnalyticsBreakdownItem[];
  acquisitionChannels: AnalyticsBreakdownItem[];
};

type QueryRow = Record<string, string | number | null>;

export function parseAnalyticsOverviewRange(value: string | string[] | undefined): AnalyticsOverviewRange {
  const candidate = Array.isArray(value) ? value[0] : value;
  return ANALYTICS_OVERVIEW_RANGES.includes(candidate as AnalyticsOverviewRange)
    ? candidate as AnalyticsOverviewRange
    : "7d";
}

function startOfUtcDay(timestampSeconds: number): number {
  const date = new Date(timestampSeconds * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
}

function rangeStart(range: AnalyticsOverviewRange, nowSeconds: number): number {
  const today = startOfUtcDay(nowSeconds);
  if (range === "today") return today;
  return today - (range === "7d" ? 6 : 29) * 86_400;
}

function count(row: QueryRow | undefined, key: string): number {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function breakdown(rows: QueryRow[], dimension: string): AnalyticsBreakdownItem[] {
  return rows
    .filter((row) => row.dimension === dimension && typeof row.label === "string")
    .map((row) => ({ label: row.label as string, count: count(row, "total") }));
}

async function queryAnalyticsOverview(range: AnalyticsOverviewRange): Promise<AnalyticsOverview> {
  const refreshedAt = Math.floor(Date.now() / 1000);
  const startAt = rangeStart(range, refreshedAt);
  const endAt = refreshedAt + 1;
  const db = await analyticsDatabase();

  const statements = [
    db.prepare(`
      SELECT
        COUNT(*) AS sessions,
        COUNT(DISTINCT visitor_id) AS unique_visitors
      FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ?
    `).bind(startAt, endAt),
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN event_name = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
        COALESCE(SUM(CASE WHEN event_name = 'product_view' THEN 1 ELSE 0 END), 0) AS product_views,
        COALESCE(SUM(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END), 0) AS add_to_cart,
        COALESCE(SUM(CASE WHEN event_name = 'checkout_started' THEN 1 ELSE 0 END), 0) AS checkout_started
      FROM analytics_events
      WHERE occurred_at >= ? AND occurred_at < ?
        AND event_name IN ('page_view', 'product_view', 'add_to_cart', 'checkout_started')
    `).bind(startAt, endAt),
    db.prepare(`
      SELECT dimension, label, total FROM (
        SELECT 'country' AS dimension, COALESCE(NULLIF(country_code, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions
        WHERE started_at >= ? AND started_at < ?
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'device' AS dimension, COALESCE(NULLIF(device_type, ''), 'unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions
        WHERE started_at >= ? AND started_at < ?
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'browser' AS dimension, COALESCE(NULLIF(browser_name, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions
        WHERE started_at >= ? AND started_at < ?
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'acquisition' AS dimension, COALESCE(NULLIF(acquisition_channel, ''), 'unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions
        WHERE started_at >= ? AND started_at < ?
        GROUP BY label
        ORDER BY total DESC, label ASC
        LIMIT 5
      )
    `).bind(
      startAt, endAt,
      startAt, endAt,
      startAt, endAt,
      startAt, endAt,
    ),
  ];

  const [sessionResult, eventResult, breakdownResult] = await db.batch<QueryRow>(statements);
  if (!sessionResult.success || !eventResult.success || !breakdownResult.success) {
    throw new Error("Analytics overview query failed");
  }

  const sessionRow = sessionResult.results[0];
  const eventRow = eventResult.results[0];
  const breakdownRows = breakdownResult.results;

  return {
    range,
    startAt,
    endAt,
    refreshedAt,
    metrics: {
      sessions: count(sessionRow, "sessions"),
      uniqueVisitors: count(sessionRow, "unique_visitors"),
      pageViews: count(eventRow, "page_views"),
      productViews: count(eventRow, "product_views"),
      addToCart: count(eventRow, "add_to_cart"),
      checkoutStarted: count(eventRow, "checkout_started"),
    },
    countries: breakdown(breakdownRows, "country"),
    devices: breakdown(breakdownRows, "device"),
    browsers: breakdown(breakdownRows, "browser"),
    acquisitionChannels: breakdown(breakdownRows, "acquisition"),
  };
}

const cachedAnalyticsOverview = unstable_cache(
  queryAnalyticsOverview,
  ["analytics-overview-v1"],
  { revalidate: 3600, tags: ["analytics-overview"] },
);

export function getAnalyticsOverview(range: AnalyticsOverviewRange): Promise<AnalyticsOverview> {
  return cachedAnalyticsOverview(range);
}
