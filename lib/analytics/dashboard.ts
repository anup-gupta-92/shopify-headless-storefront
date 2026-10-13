import "server-only";

import { unstable_cache } from "next/cache";
import { analyticsDatabase } from "@/lib/analytics/server";

export const ANALYTICS_OVERVIEW_RANGES = ["7d", "15d", "30d", "60d", "90d"] as const;
export type AnalyticsOverviewRange = (typeof ANALYTICS_OVERVIEW_RANGES)[number];

const DEVICE_VALUES = ["mobile", "desktop", "tablet", "unknown"] as const;
export type AnalyticsCountryMode = "all" | "include" | "exclude";

export type AnalyticsDashboardFilters = {
  countryMode: AnalyticsCountryMode;
  country: string | null;
  device: string | null;
  browser: string | null;
  os: string | null;
};

export type AnalyticsDashboardQuery = AnalyticsDashboardFilters & {
  range: AnalyticsOverviewRange;
};

export type AnalyticsBreakdownItem = { label: string; count: number };
export type AnalyticsFilterOptions = {
  countries: string[];
  devices: string[];
  browsers: string[];
  operatingSystems: string[];
};

export type AnalyticsOverview = {
  query: AnalyticsDashboardQuery;
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
  filterOptions: AnalyticsFilterOptions;
};

type SearchValue = string | string[] | undefined;
type QueryRow = Record<string, string | number | null>;
type SqlFilter = { sql: string; values: Array<string | number> };

function firstValue(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cleanDimension(value: SearchValue): string | null {
  const candidate = firstValue(value)?.trim();
  return candidate && candidate.length <= 64 ? candidate : null;
}

export function parseAnalyticsDashboardQuery(searchParams: Record<string, SearchValue>): AnalyticsDashboardQuery {
  const rangeValue = firstValue(searchParams.range);
  const range = ANALYTICS_OVERVIEW_RANGES.includes(rangeValue as AnalyticsOverviewRange)
    ? rangeValue as AnalyticsOverviewRange
    : "30d";
  const countryValue = firstValue(searchParams.country)?.trim().toUpperCase() ?? "";
  const country = /^[A-Z]{2}$/.test(countryValue) ? countryValue : null;
  const modeValue = firstValue(searchParams.countryMode);
  const countryMode: AnalyticsCountryMode = country && (modeValue === "include" || modeValue === "exclude")
    ? modeValue
    : "all";
  const deviceValue = firstValue(searchParams.device)?.trim().toLowerCase();
  const device = DEVICE_VALUES.includes(deviceValue as (typeof DEVICE_VALUES)[number]) ? deviceValue! : null;

  return {
    range,
    countryMode,
    country: countryMode === "all" ? null : country,
    device,
    browser: cleanDimension(searchParams.browser),
    os: cleanDimension(searchParams.os),
  };
}

export function analyticsDashboardQueryString(query: AnalyticsDashboardQuery): string {
  const params = new URLSearchParams({ range: query.range });
  if (query.countryMode !== "all" && query.country) {
    params.set("countryMode", query.countryMode);
    params.set("country", query.country);
  }
  if (query.device) params.set("device", query.device);
  if (query.browser) params.set("browser", query.browser);
  if (query.os) params.set("os", query.os);
  return params.toString();
}

function startOfUtcDay(timestampSeconds: number): number {
  const date = new Date(timestampSeconds * 1000);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000;
}

function rangeStart(range: AnalyticsOverviewRange, nowSeconds: number): number {
  const days = Number.parseInt(range, 10);
  return startOfUtcDay(nowSeconds) - (days - 1) * 86_400;
}

function dimensionFilters(alias: string, filters: AnalyticsDashboardFilters): SqlFilter {
  const predicates: string[] = [];
  const values: string[] = [];

  if (filters.countryMode === "include" && filters.country) {
    predicates.push(`${alias}.country_code = ?`);
    values.push(filters.country);
  } else if (filters.countryMode === "exclude" && filters.country) {
    predicates.push(`COALESCE(${alias}.country_code, '') <> ?`);
    values.push(filters.country);
  }
  if (filters.device) {
    predicates.push(`COALESCE(NULLIF(${alias}.device_type, ''), 'unknown') = ?`);
    values.push(filters.device);
  }
  if (filters.browser) {
    predicates.push(`COALESCE(NULLIF(${alias}.browser_name, ''), 'Unknown') = ?`);
    values.push(filters.browser);
  }
  if (filters.os) {
    predicates.push(`COALESCE(NULLIF(${alias}.os_name, ''), 'Unknown') = ?`);
    values.push(filters.os);
  }

  return { sql: predicates.length ? ` AND ${predicates.join(" AND ")}` : "", values };
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

function options(rows: QueryRow[], dimension: string): string[] {
  return rows
    .filter((row) => row.dimension === dimension && typeof row.label === "string")
    .map((row) => row.label as string);
}

async function queryAnalyticsOverview(
  range: AnalyticsOverviewRange,
  countryMode: AnalyticsCountryMode,
  country: string | null,
  device: string | null,
  browser: string | null,
  os: string | null,
): Promise<AnalyticsOverview> {
  const query: AnalyticsDashboardQuery = { range, countryMode, country, device, browser, os };
  const refreshedAt = Math.floor(Date.now() / 1000);
  const startAt = rangeStart(range, refreshedAt);
  const endAt = refreshedAt + 1;
  const db = await analyticsDatabase();
  const sessionFilter = dimensionFilters("s", query);

  const statements = [
    db.prepare(`
      SELECT COUNT(*) AS sessions, COUNT(DISTINCT s.visitor_id) AS unique_visitors
      FROM analytics_sessions AS s
      WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
    `).bind(startAt, endAt, ...sessionFilter.values),
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN e.event_name = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
        COALESCE(SUM(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END), 0) AS product_views,
        COALESCE(SUM(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END), 0) AS add_to_cart,
        COALESCE(SUM(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END), 0) AS checkout_started
      FROM analytics_events AS e
      INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
      WHERE e.occurred_at >= ? AND e.occurred_at < ?${sessionFilter.sql}
        AND e.event_name IN ('page_view', 'product_view', 'add_to_cart', 'checkout_started')
    `).bind(startAt, endAt, ...sessionFilter.values),
    db.prepare(`
      SELECT dimension, label, total FROM (
        SELECT 'country' AS dimension, COALESCE(NULLIF(s.country_code, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions AS s WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'device' AS dimension, COALESCE(NULLIF(s.device_type, ''), 'unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions AS s WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'browser' AS dimension, COALESCE(NULLIF(s.browser_name, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions AS s WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'acquisition' AS dimension, COALESCE(NULLIF(s.acquisition_channel, ''), 'unknown') AS label, COUNT(*) AS total
        FROM analytics_sessions AS s WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
    `).bind(
      startAt, endAt, ...sessionFilter.values,
      startAt, endAt, ...sessionFilter.values,
      startAt, endAt, ...sessionFilter.values,
      startAt, endAt, ...sessionFilter.values,
    ),
    db.prepare(`
      SELECT 'country' AS dimension, country_code AS label FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ? AND country_code IS NOT NULL AND country_code <> '' GROUP BY country_code
      UNION ALL
      SELECT 'device' AS dimension, COALESCE(NULLIF(device_type, ''), 'unknown') AS label FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ? GROUP BY label
      UNION ALL
      SELECT 'browser' AS dimension, COALESCE(NULLIF(browser_name, ''), 'Unknown') AS label FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ? GROUP BY label
      UNION ALL
      SELECT 'os' AS dimension, COALESCE(NULLIF(os_name, ''), 'Unknown') AS label FROM analytics_sessions
      WHERE started_at >= ? AND started_at < ? GROUP BY label
      ORDER BY dimension, label
    `).bind(
      startAt, endAt,
      startAt, endAt,
      startAt, endAt,
      startAt, endAt,
    ),
  ];

  const [sessionResult, eventResult, breakdownResult, optionResult] = await db.batch<QueryRow>(statements);
  if (!sessionResult.success || !eventResult.success || !breakdownResult.success || !optionResult.success) {
    throw new Error("Analytics overview query failed");
  }

  const sessionRow = sessionResult.results[0];
  const eventRow = eventResult.results[0];

  return {
    query,
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
    countries: breakdown(breakdownResult.results, "country"),
    devices: breakdown(breakdownResult.results, "device"),
    browsers: breakdown(breakdownResult.results, "browser"),
    acquisitionChannels: breakdown(breakdownResult.results, "acquisition"),
    filterOptions: {
      countries: options(optionResult.results, "country"),
      devices: options(optionResult.results, "device"),
      browsers: options(optionResult.results, "browser"),
      operatingSystems: options(optionResult.results, "os"),
    },
  };
}

const cachedAnalyticsOverview = unstable_cache(
  queryAnalyticsOverview,
  ["analytics-overview-v2"],
  { revalidate: 3600, tags: ["analytics-overview"] },
);

export function getAnalyticsOverview(query: AnalyticsDashboardQuery): Promise<AnalyticsOverview> {
  return cachedAnalyticsOverview(
    query.range,
    query.countryMode,
    query.country,
    query.device,
    query.browser,
    query.os,
  );
}
