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
export type AnalyticsProductItem = AnalyticsBreakdownItem & {
  handle: string | null;
  productId: string | null;
  sku: string | null;
};
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
  operatingSystems: AnalyticsBreakdownItem[];
  acquisitionChannels: AnalyticsBreakdownItem[];
  landingPages: AnalyticsBreakdownItem[];
  topViewedProducts: AnalyticsProductItem[];
  theme: {
    initialLight: number;
    initialDark: number;
    switchedToLight: number;
    switchedToDark: number;
    totalSwitches: number;
  };
  search: {
    total: number;
    uniqueQueries: number;
    zeroResults: number;
    topTerms: AnalyticsBreakdownItem[];
  };
  commerce: {
    addToCart: number;
    addToCartSessions: number;
    addToCartVisitors: number;
    cartOpened: number;
    checkoutStarted: number;
    checkoutStartedSessions: number;
    checkoutStartedVisitors: number;
  };
  bulkOrdering: {
    interactions: number;
    sessions: number;
  };
  consent: {
    accepted: number;
    rejected: number;
    acceptanceRate: number | null;
  };
  notFound: {
    total: number;
    uniquePaths: number;
    topPaths: AnalyticsBreakdownItem[];
  };
  homepageInteractions: {
    hotspotClicks: number;
    topProducts: AnalyticsBreakdownItem[];
  };
  pwa: {
    promptShown: number;
    installClicked: number;
    dismissed: number;
    installed: number;
    standaloneLaunches: number;
  };
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
  const combinedCountry = firstValue(searchParams.countryFilter)?.trim();
  const combinedMatch = combinedCountry?.match(/^(include|exclude):([A-Za-z]{2})$/);
  const legacyCountry = firstValue(searchParams.country)?.trim().toUpperCase() ?? "";
  const legacyMode = firstValue(searchParams.countryMode);
  const country = combinedMatch
    ? combinedMatch[2].toUpperCase()
    : /^[A-Z]{2}$/.test(legacyCountry) ? legacyCountry : null;
  const countryMode: AnalyticsCountryMode = combinedMatch
    ? combinedMatch[1] as AnalyticsCountryMode
    : country && (legacyMode === "include" || legacyMode === "exclude") ? legacyMode : "all";
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
    params.set("countryFilter", `${query.countryMode}:${query.country}`);
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

function productBreakdown(rows: QueryRow[], dimension: string): AnalyticsProductItem[] {
  return rows
    .filter((row) => row.dimension === dimension && typeof row.label === "string")
    .map((row) => ({
      label: row.label as string,
      count: count(row, "total"),
      handle: typeof row.handle === "string" ? row.handle : null,
      productId: typeof row.product_id === "string" ? row.product_id : null,
      sku: typeof row.sku === "string" ? row.sku : null,
    }));
}

function utcDate(timestampSeconds: number): string {
  return new Date(timestampSeconds * 1000).toISOString().slice(0, 10);
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
      SELECT
        COUNT(*) AS sessions,
        COUNT(DISTINCT s.visitor_id) AS unique_visitors,
        COALESCE(SUM(CASE WHEN s.initial_theme = 'light' THEN 1 ELSE 0 END), 0) AS initial_light,
        COALESCE(SUM(CASE WHEN s.initial_theme = 'dark' THEN 1 ELSE 0 END), 0) AS initial_dark
      FROM analytics_sessions AS s
      WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
    `).bind(startAt, endAt, ...sessionFilter.values),
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN e.event_name = 'page_view' THEN 1 ELSE 0 END), 0) AS page_views,
        COALESCE(SUM(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END), 0) AS product_views,
        COALESCE(SUM(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END), 0) AS add_to_cart,
        COUNT(DISTINCT CASE WHEN e.event_name = 'add_to_cart' THEN e.session_id END) AS add_to_cart_sessions,
        COUNT(DISTINCT CASE WHEN e.event_name = 'add_to_cart' THEN s.visitor_id END) AS add_to_cart_visitors,
        COALESCE(SUM(CASE WHEN e.event_name = 'cart_opened' THEN 1 ELSE 0 END), 0) AS cart_opened,
        COALESCE(SUM(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END), 0) AS checkout_started,
        COUNT(DISTINCT CASE WHEN e.event_name = 'checkout_started' THEN e.session_id END) AS checkout_started_sessions,
        COUNT(DISTINCT CASE WHEN e.event_name = 'checkout_started' THEN s.visitor_id END) AS checkout_started_visitors,
        COALESCE(SUM(CASE WHEN e.event_name = 'bulk_order_interaction' THEN 1 ELSE 0 END), 0) AS bulk_interactions,
        COUNT(DISTINCT CASE WHEN e.event_name = 'bulk_order_interaction' THEN e.session_id END) AS bulk_sessions,
        COALESCE(SUM(CASE WHEN e.event_name = 'theme_changed' THEN 1 ELSE 0 END), 0) AS theme_switches,
        COALESCE(SUM(CASE WHEN e.event_name = 'theme_changed' AND json_extract(e.properties_json, '$.to') = 'light' THEN 1 ELSE 0 END), 0) AS switched_to_light,
        COALESCE(SUM(CASE WHEN e.event_name = 'theme_changed' AND json_extract(e.properties_json, '$.to') = 'dark' THEN 1 ELSE 0 END), 0) AS switched_to_dark,
        COALESCE(SUM(CASE WHEN e.event_name = 'search_performed' THEN 1 ELSE 0 END), 0) AS searches,
        COUNT(DISTINCT CASE
          WHEN e.event_name = 'search_performed' AND json_type(e.properties_json, '$.query') = 'text'
          THEN lower(trim(json_extract(e.properties_json, '$.query')))
        END) AS unique_search_queries,
        COALESCE(SUM(CASE
          WHEN e.event_name = 'search_performed' AND CAST(json_extract(e.properties_json, '$.result_count') AS INTEGER) = 0
          THEN 1 ELSE 0
        END), 0) AS zero_result_searches,
        COALESCE(SUM(CASE WHEN e.event_name = '404_view' AND e.page_path <> '/admin' AND e.page_path NOT LIKE '/admin/%' THEN 1 ELSE 0 END), 0) AS not_found_views,
        COUNT(DISTINCT CASE
          WHEN e.event_name = '404_view' AND e.page_path <> '/admin' AND e.page_path NOT LIKE '/admin/%'
          THEN e.page_path
        END) AS unique_not_found_paths,
        COALESCE(SUM(CASE
          WHEN e.event_name = 'product_hotspot_clicked' AND e.source_surface = 'homepage_tagged_image'
          THEN 1 ELSE 0
        END), 0) AS hotspot_clicks,
        COALESCE(SUM(CASE WHEN e.event_name = 'pwa_install_prompt_shown' THEN 1 ELSE 0 END), 0) AS pwa_prompt_shown,
        COALESCE(SUM(CASE WHEN e.event_name = 'pwa_install_clicked' THEN 1 ELSE 0 END), 0) AS pwa_install_clicked,
        COALESCE(SUM(CASE WHEN e.event_name = 'pwa_install_dismissed' THEN 1 ELSE 0 END), 0) AS pwa_dismissed,
        COALESCE(SUM(CASE WHEN e.event_name = 'pwa_installed' THEN 1 ELSE 0 END), 0) AS pwa_installed,
        COALESCE(SUM(CASE WHEN e.event_name = 'pwa_launched_standalone' THEN 1 ELSE 0 END), 0) AS pwa_standalone_launches
      FROM analytics_events AS e
      INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
      WHERE e.occurred_at >= ? AND e.occurred_at < ?${sessionFilter.sql}
        AND e.event_name IN (
          'page_view', 'product_view', 'add_to_cart', 'cart_opened', 'checkout_started',
          'bulk_order_interaction', 'theme_changed', 'search_performed', '404_view',
          'product_hotspot_clicked', 'pwa_install_prompt_shown', 'pwa_install_clicked',
          'pwa_install_dismissed', 'pwa_installed', 'pwa_launched_standalone'
        )
    `).bind(startAt, endAt, ...sessionFilter.values),
    db.prepare(`
      WITH filtered_sessions AS (
        SELECT s.* FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
      )
      SELECT dimension, label, total FROM (
        SELECT 'country' AS dimension, COALESCE(NULLIF(s.country_code, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM filtered_sessions AS s
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'device' AS dimension, COALESCE(NULLIF(s.device_type, ''), 'unknown') AS label, COUNT(*) AS total
        FROM filtered_sessions AS s
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'browser' AS dimension, COALESCE(NULLIF(s.browser_name, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM filtered_sessions AS s
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'os' AS dimension, COALESCE(NULLIF(s.os_name, ''), 'Unknown') AS label, COUNT(*) AS total
        FROM filtered_sessions AS s
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total FROM (
        SELECT 'acquisition' AS dimension, COALESCE(NULLIF(s.acquisition_channel, ''), 'unknown') AS label, COUNT(*) AS total
        FROM filtered_sessions AS s
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
    `).bind(startAt, endAt, ...sessionFilter.values),
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
    db.prepare(`
      WITH filtered_events AS (
        SELECT e.*
        FROM analytics_events AS e
        INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
        WHERE e.occurred_at >= ? AND e.occurred_at < ?${sessionFilter.sql}
      )
      SELECT dimension, label, total, handle, product_id, sku FROM (
        SELECT
          'search_term' AS dimension,
          MIN(trim(json_extract(properties_json, '$.query'))) AS label,
          COUNT(*) AS total,
          NULL AS handle,
          NULL AS product_id,
          NULL AS sku
        FROM filtered_events
        WHERE event_name = 'search_performed'
          AND json_type(properties_json, '$.query') = 'text'
          AND trim(json_extract(properties_json, '$.query')) <> ''
        GROUP BY lower(trim(json_extract(properties_json, '$.query')))
        ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total, handle, product_id, sku FROM (
        SELECT 'not_found_path' AS dimension, page_path AS label, COUNT(*) AS total,
          NULL AS handle, NULL AS product_id, NULL AS sku
        FROM filtered_events
        WHERE event_name = '404_view' AND page_path IS NOT NULL AND page_path <> ''
          AND page_path <> '/admin' AND page_path NOT LIKE '/admin/%'
        GROUP BY page_path ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total, handle, product_id, sku FROM (
        SELECT
          'hotspot_product' AS dimension,
          COALESCE(NULLIF(product_handle, ''), NULLIF(product_id, '')) AS label,
          COUNT(*) AS total,
          NULL AS handle,
          NULL AS product_id,
          NULL AS sku
        FROM filtered_events
        WHERE event_name = 'product_hotspot_clicked'
          AND source_surface = 'homepage_tagged_image'
          AND COALESCE(NULLIF(product_handle, ''), NULLIF(product_id, '')) IS NOT NULL
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total, handle, product_id, sku FROM (
        SELECT
          'landing_path' AS dimension,
          COALESCE(NULLIF(s.landing_path, ''), '/') AS label,
          COUNT(*) AS total,
          NULL AS handle,
          NULL AS product_id,
          NULL AS sku
        FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
        GROUP BY label ORDER BY total DESC, label ASC LIMIT 5
      )
      UNION ALL
      SELECT dimension, label, total, handle, product_id, sku FROM (
        SELECT
          'viewed_product' AS dimension,
          COALESCE(NULLIF(product_handle, ''), NULLIF(product_id, '')) AS label,
          COUNT(*) AS total,
          NULLIF(product_handle, '') AS handle,
          MIN(NULLIF(product_id, '')) AS product_id,
          MIN(NULLIF(sku, '')) AS sku
        FROM filtered_events
        WHERE event_name = 'product_view'
          AND COALESCE(NULLIF(product_handle, ''), NULLIF(product_id, '')) IS NOT NULL
        GROUP BY label, handle ORDER BY total DESC, label ASC LIMIT 5
      )
    `).bind(
      startAt, endAt, ...sessionFilter.values,
      startAt, endAt, ...sessionFilter.values,
    ),
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN decision = 'accepted' THEN count ELSE 0 END), 0) AS accepted,
        COALESCE(SUM(CASE WHEN decision = 'rejected' THEN count ELSE 0 END), 0) AS rejected
      FROM analytics_consent_daily
      WHERE bucket_date >= ? AND bucket_date <= ?
    `).bind(utcDate(startAt), utcDate(refreshedAt)),
  ];

  const [sessionResult, eventResult, breakdownResult, optionResult, topListResult, consentResult] = await db.batch<QueryRow>(statements);
  if (!sessionResult.success || !eventResult.success || !breakdownResult.success || !optionResult.success || !topListResult.success || !consentResult.success) {
    throw new Error("Analytics overview query failed");
  }

  const sessionRow = sessionResult.results[0];
  const eventRow = eventResult.results[0];
  const consentRow = consentResult.results[0];
  const sessions = count(sessionRow, "sessions");
  const accepted = count(consentRow, "accepted");
  const rejected = count(consentRow, "rejected");
  const consentDecisions = accepted + rejected;

  return {
    query,
    startAt,
    endAt,
    refreshedAt,
    metrics: {
      sessions,
      uniqueVisitors: count(sessionRow, "unique_visitors"),
      pageViews: count(eventRow, "page_views"),
      productViews: count(eventRow, "product_views"),
      addToCart: count(eventRow, "add_to_cart"),
      checkoutStarted: count(eventRow, "checkout_started"),
    },
    countries: breakdown(breakdownResult.results, "country"),
    devices: breakdown(breakdownResult.results, "device"),
    browsers: breakdown(breakdownResult.results, "browser"),
    operatingSystems: breakdown(breakdownResult.results, "os"),
    acquisitionChannels: breakdown(breakdownResult.results, "acquisition"),
    landingPages: breakdown(topListResult.results, "landing_path"),
    topViewedProducts: productBreakdown(topListResult.results, "viewed_product"),
    theme: {
      initialLight: count(sessionRow, "initial_light"),
      initialDark: count(sessionRow, "initial_dark"),
      switchedToLight: count(eventRow, "switched_to_light"),
      switchedToDark: count(eventRow, "switched_to_dark"),
      totalSwitches: count(eventRow, "theme_switches"),
    },
    search: {
      total: count(eventRow, "searches"),
      uniqueQueries: count(eventRow, "unique_search_queries"),
      zeroResults: count(eventRow, "zero_result_searches"),
      topTerms: breakdown(topListResult.results, "search_term"),
    },
    commerce: {
      addToCart: count(eventRow, "add_to_cart"),
      addToCartSessions: count(eventRow, "add_to_cart_sessions"),
      addToCartVisitors: count(eventRow, "add_to_cart_visitors"),
      cartOpened: count(eventRow, "cart_opened"),
      checkoutStarted: count(eventRow, "checkout_started"),
      checkoutStartedSessions: count(eventRow, "checkout_started_sessions"),
      checkoutStartedVisitors: count(eventRow, "checkout_started_visitors"),
    },
    bulkOrdering: {
      interactions: count(eventRow, "bulk_interactions"),
      sessions: count(eventRow, "bulk_sessions"),
    },
    consent: {
      accepted,
      rejected,
      acceptanceRate: consentDecisions ? accepted / consentDecisions : null,
    },
    notFound: {
      total: count(eventRow, "not_found_views"),
      uniquePaths: count(eventRow, "unique_not_found_paths"),
      topPaths: breakdown(topListResult.results, "not_found_path"),
    },
    homepageInteractions: {
      hotspotClicks: count(eventRow, "hotspot_clicks"),
      topProducts: breakdown(topListResult.results, "hotspot_product"),
    },
    pwa: {
      promptShown: count(eventRow, "pwa_prompt_shown"),
      installClicked: count(eventRow, "pwa_install_clicked"),
      dismissed: count(eventRow, "pwa_dismissed"),
      installed: count(eventRow, "pwa_installed"),
      standaloneLaunches: count(eventRow, "pwa_standalone_launches"),
    },
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
  ["analytics-overview-v5"],
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
