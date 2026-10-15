import "server-only";

import { unstable_cache } from "next/cache";
import { analyticsDatabase } from "@/lib/analytics/server";
import {
  analyticsDimensionFilters,
  analyticsRangeStart,
  parseAnalyticsDashboardQuery,
  type AnalyticsDashboardQuery,
  type AnalyticsSearchValue,
} from "@/lib/analytics/dashboard";

export const ANALYTICS_DETAIL_TABS = ["products", "landing-pages", "search-terms"] as const;
export type AnalyticsDetailTab = (typeof ANALYTICS_DETAIL_TABS)[number];
export type AnalyticsSortDirection = "asc" | "desc";

export type AnalyticsDetailsQuery = AnalyticsDashboardQuery & {
  tab: AnalyticsDetailTab;
  page: number;
  search: string;
  sort: string;
  direction: AnalyticsSortDirection;
};

export type ProductDetailRow = {
  productId: string | null;
  productHandle: string | null;
  sku: string | null;
  productViews: number;
  uniqueViewVisitors: number;
  addToCartEvents: number;
  uniqueAddToCartVisitors: number;
  viewToAddRate: number | null;
};

export type LandingPageDetailRow = {
  landingPath: string;
  sessions: number;
  uniqueVisitors: number;
  pageViews: number;
  productViews: number;
  addToCartEvents: number;
  checkoutStartEvents: number;
  topAcquisitionChannel: string | null;
};

export type SearchTermDetailRow = {
  query: string;
  searchCount: number;
  uniqueSessions: number;
  zeroResultCount: number;
};

type DetailResultBase = {
  query: AnalyticsDetailsQuery;
  totalRows: number;
  totalPages: number;
  refreshedAt: number;
};

export type AnalyticsDetailsResult =
  | DetailResultBase & { tab: "products"; rows: ProductDetailRow[] }
  | DetailResultBase & { tab: "landing-pages"; rows: LandingPageDetailRow[] }
  | DetailResultBase & { tab: "search-terms"; rows: SearchTermDetailRow[] };

const PAGE_SIZE = 25;
type QueryRow = Record<string, string | number | null>;

const sortColumns: Record<AnalyticsDetailTab, Record<string, string>> = {
  products: {
    product: "product_label",
    sku: "sku",
    views: "product_views",
    visitors: "unique_view_visitors",
    adds: "add_to_cart_events",
    addVisitors: "unique_add_visitors",
    rate: "view_to_add_rate",
  },
  "landing-pages": {
    path: "landing_path",
    sessions: "sessions",
    visitors: "unique_visitors",
    pageViews: "page_views",
    productViews: "product_views",
    adds: "add_to_cart_events",
    checkouts: "checkout_start_events",
    acquisition: "top_acquisition_channel",
  },
  "search-terms": {
    query: "query_label",
    searches: "search_count",
    sessions: "unique_sessions",
    zeroResults: "zero_result_count",
  },
};

const defaultSort: Record<AnalyticsDetailTab, string> = {
  products: "views",
  "landing-pages": "sessions",
  "search-terms": "searches",
};

function firstValue(value: AnalyticsSearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseAnalyticsDetailsQuery(
  searchParams: Record<string, AnalyticsSearchValue>,
): AnalyticsDetailsQuery {
  const dashboardQuery = parseAnalyticsDashboardQuery(searchParams);
  const requestedTab = firstValue(searchParams.tab);
  const tab = ANALYTICS_DETAIL_TABS.includes(requestedTab as AnalyticsDetailTab)
    ? requestedTab as AnalyticsDetailTab
    : "products";
  const requestedPage = Number.parseInt(firstValue(searchParams.page) ?? "1", 10);
  const page = Number.isInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 10_000)
    : 1;
  const search = (firstValue(searchParams.q) ?? "").trim().slice(0, 100);
  const requestedSort = firstValue(searchParams.sort) ?? "";
  const sort = Object.hasOwn(sortColumns[tab], requestedSort) ? requestedSort : defaultSort[tab];
  const direction = firstValue(searchParams.direction) === "asc" ? "asc" : "desc";

  return { ...dashboardQuery, tab, page, search, sort, direction };
}

function numberValue(row: QueryRow, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(row: QueryRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value ? value : null;
}

function likePattern(value: string): string {
  return `%${value.toLocaleLowerCase("en-GB").replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
}

async function queryAnalyticsDetails(
  range: AnalyticsDetailsQuery["range"],
  countryMode: AnalyticsDetailsQuery["countryMode"],
  country: string | null,
  device: string | null,
  browser: string | null,
  os: string | null,
  tab: AnalyticsDetailTab,
  page: number,
  search: string,
  sort: string,
  direction: AnalyticsSortDirection,
): Promise<AnalyticsDetailsResult> {
  const query: AnalyticsDetailsQuery = {
    range, countryMode, country, device, browser, os, tab, page, search, sort, direction,
  };
  const refreshedAt = Math.floor(Date.now() / 1000);
  const startAt = analyticsRangeStart(range, refreshedAt);
  const endAt = refreshedAt + 1;
  const offset = (page - 1) * PAGE_SIZE;
  const db = await analyticsDatabase();
  const sessionFilter = analyticsDimensionFilters("s", query);
  const searchPattern = likePattern(search);
  const orderColumn = sortColumns[tab][sort] ?? sortColumns[tab][defaultSort[tab]];
  const orderDirection = direction === "asc" ? "ASC" : "DESC";

  let dataStatement;
  let countStatement;

  if (tab === "products") {
    const aggregateSql = `
      WITH normalized_events AS (
        SELECT e.*, s.visitor_id,
          COALESCE(NULLIF(e.product_id, ''), 'handle:' || e.product_handle) AS product_key
        FROM analytics_events AS e
        INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
        WHERE e.occurred_at >= ? AND e.occurred_at < ?${sessionFilter.sql}
          AND e.event_name IN ('product_view', 'add_to_cart')
          AND COALESCE(NULLIF(e.product_id, ''), NULLIF(e.product_handle, '')) IS NOT NULL
      ), event_totals AS (
        SELECT
          product_key,
          MIN(NULLIF(product_id, '')) AS product_id,
          MIN(NULLIF(product_handle, '')) AS product_handle,
          CASE WHEN COUNT(DISTINCT NULLIF(sku, '')) = 1 THEN MIN(NULLIF(sku, '')) END AS sku,
          COALESCE(MIN(NULLIF(product_handle, '')), MIN(NULLIF(product_id, ''))) AS product_label,
          SUM(CASE WHEN event_name = 'product_view' THEN 1 ELSE 0 END) AS product_views,
          SUM(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_events
        FROM normalized_events
        GROUP BY product_key
      ), visitor_actions AS (
        SELECT product_key, visitor_id,
          MIN(CASE WHEN event_name = 'product_view' THEN occurred_at END) AS first_view_at,
          MAX(CASE WHEN event_name = 'add_to_cart' THEN occurred_at END) AS last_add_at,
          MAX(CASE WHEN event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS added
        FROM normalized_events
        GROUP BY product_key, visitor_id
      ), visitor_totals AS (
        SELECT product_key,
          SUM(CASE WHEN first_view_at IS NOT NULL THEN 1 ELSE 0 END) AS unique_view_visitors,
          SUM(added) AS unique_add_visitors,
          SUM(CASE WHEN first_view_at IS NOT NULL AND last_add_at >= first_view_at THEN 1 ELSE 0 END) AS converted_viewers
        FROM visitor_actions
        GROUP BY product_key
      ), aggregated AS (
        SELECT e.*, v.unique_view_visitors, v.unique_add_visitors,
          CASE WHEN v.unique_view_visitors > 0
            THEN CAST(v.converted_viewers AS REAL) / v.unique_view_visitors ELSE NULL END AS view_to_add_rate
        FROM event_totals AS e
        INNER JOIN visitor_totals AS v ON v.product_key = e.product_key
      )`;
    const searchSql = `(? = '' OR lower(COALESCE(product_handle, '')) LIKE ? ESCAPE '\\'
      OR lower(COALESCE(sku, '')) LIKE ? ESCAPE '\\'
      OR lower(COALESCE(product_id, '')) LIKE ? ESCAPE '\\')`;
    const commonValues = [startAt, endAt, ...sessionFilter.values, search, searchPattern, searchPattern, searchPattern];
    dataStatement = db.prepare(`${aggregateSql}
      SELECT * FROM aggregated WHERE ${searchSql}
      ORDER BY ${orderColumn} ${orderDirection}, product_label ASC LIMIT ? OFFSET ?
    `).bind(...commonValues, PAGE_SIZE, offset);
    countStatement = db.prepare(`${aggregateSql}
      SELECT COUNT(*) AS total FROM aggregated WHERE ${searchSql}
    `).bind(...commonValues);
  } else if (tab === "landing-pages") {
    const aggregateSql = `
      WITH filtered_sessions AS (
        SELECT s.*, COALESCE(NULLIF(s.landing_path, ''), '/') AS landing_key
        FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
      ), filtered_events AS (
        SELECT e.* FROM analytics_events AS e
        WHERE e.occurred_at >= ? AND e.occurred_at < ?
          AND e.event_name IN ('page_view', 'product_view', 'add_to_cart', 'checkout_started')
      ), aggregated AS (
        SELECT
          s.landing_key AS landing_path,
          COUNT(DISTINCT s.session_id) AS sessions,
          COUNT(DISTINCT s.visitor_id) AS unique_visitors,
          SUM(CASE WHEN e.event_name = 'page_view' THEN 1 ELSE 0 END) AS page_views,
          SUM(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END) AS product_views,
          SUM(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS add_to_cart_events,
          SUM(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END) AS checkout_start_events
        FROM filtered_sessions AS s
        LEFT JOIN filtered_events AS e ON e.session_id = s.session_id
        GROUP BY s.landing_key
      ), channel_counts AS (
        SELECT landing_key, COALESCE(NULLIF(acquisition_channel, ''), 'unknown') AS channel, COUNT(*) AS channel_total
        FROM filtered_sessions GROUP BY landing_key, channel
      ), ranked_channels AS (
        SELECT landing_key, channel,
          ROW_NUMBER() OVER (PARTITION BY landing_key ORDER BY channel_total DESC, channel ASC) AS channel_rank
        FROM channel_counts
      )`;
    const searchSql = `(? = '' OR lower(a.landing_path) LIKE ? ESCAPE '\\')`;
    const commonValues = [
      startAt, endAt, ...sessionFilter.values,
      startAt, endAt,
      search, searchPattern,
    ];
    dataStatement = db.prepare(`${aggregateSql}
      SELECT a.*, r.channel AS top_acquisition_channel
      FROM aggregated AS a
      LEFT JOIN ranked_channels AS r ON r.landing_key = a.landing_path AND r.channel_rank = 1
      WHERE ${searchSql}
      ORDER BY ${orderColumn} ${orderDirection}, a.landing_path ASC LIMIT ? OFFSET ?
    `).bind(...commonValues, PAGE_SIZE, offset);
    countStatement = db.prepare(`
      WITH filtered_sessions AS (
        SELECT COALESCE(NULLIF(s.landing_path, ''), '/') AS landing_path
        FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${sessionFilter.sql}
      )
      SELECT COUNT(DISTINCT landing_path) AS total FROM filtered_sessions
      WHERE (? = '' OR lower(landing_path) LIKE ? ESCAPE '\\')
    `).bind(startAt, endAt, ...sessionFilter.values, search, searchPattern);
  } else {
    const aggregateSql = `
      WITH filtered_searches AS (
        SELECT
          e.session_id,
          trim(json_extract(e.properties_json, '$.query')) AS query_value,
          CAST(json_extract(e.properties_json, '$.result_count') AS INTEGER) AS result_count
        FROM analytics_events AS e
        INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
        WHERE e.occurred_at >= ? AND e.occurred_at < ?${sessionFilter.sql}
          AND e.event_name = 'search_performed'
          AND json_type(e.properties_json, '$.query') = 'text'
          AND trim(json_extract(e.properties_json, '$.query')) <> ''
      ), aggregated AS (
        SELECT
          MIN(query_value) AS query_label,
          COUNT(*) AS search_count,
          COUNT(DISTINCT session_id) AS unique_sessions,
          SUM(CASE WHEN result_count = 0 THEN 1 ELSE 0 END) AS zero_result_count
        FROM filtered_searches
        GROUP BY lower(query_value)
      )`;
    const searchSql = `(? = '' OR lower(query_label) LIKE ? ESCAPE '\\')`;
    const commonValues = [startAt, endAt, ...sessionFilter.values, search, searchPattern];
    dataStatement = db.prepare(`${aggregateSql}
      SELECT * FROM aggregated WHERE ${searchSql}
      ORDER BY ${orderColumn} ${orderDirection}, query_label ASC LIMIT ? OFFSET ?
    `).bind(...commonValues, PAGE_SIZE, offset);
    countStatement = db.prepare(`${aggregateSql}
      SELECT COUNT(*) AS total FROM aggregated WHERE ${searchSql}
    `).bind(...commonValues);
  }

  const [dataResult, countResult] = await db.batch<QueryRow>([dataStatement, countStatement]);
  if (!dataResult.success || !countResult.success) throw new Error("Analytics details query failed");
  const totalRows = numberValue(countResult.results[0] ?? {}, "total");
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const base = { query, totalRows, totalPages, refreshedAt };

  if (tab === "products") {
    return {
      ...base,
      tab,
      rows: dataResult.results.map((row) => ({
        productId: stringValue(row, "product_id"),
        productHandle: stringValue(row, "product_handle"),
        sku: stringValue(row, "sku"),
        productViews: numberValue(row, "product_views"),
        uniqueViewVisitors: numberValue(row, "unique_view_visitors"),
        addToCartEvents: numberValue(row, "add_to_cart_events"),
        uniqueAddToCartVisitors: numberValue(row, "unique_add_visitors"),
        viewToAddRate: typeof row.view_to_add_rate === "number" ? row.view_to_add_rate : null,
      })),
    };
  }
  if (tab === "landing-pages") {
    return {
      ...base,
      tab,
      rows: dataResult.results.map((row) => ({
        landingPath: stringValue(row, "landing_path") ?? "/",
        sessions: numberValue(row, "sessions"),
        uniqueVisitors: numberValue(row, "unique_visitors"),
        pageViews: numberValue(row, "page_views"),
        productViews: numberValue(row, "product_views"),
        addToCartEvents: numberValue(row, "add_to_cart_events"),
        checkoutStartEvents: numberValue(row, "checkout_start_events"),
        topAcquisitionChannel: stringValue(row, "top_acquisition_channel"),
      })),
    };
  }
  return {
    ...base,
    tab,
    rows: dataResult.results.map((row) => ({
      query: stringValue(row, "query_label") ?? "",
      searchCount: numberValue(row, "search_count"),
      uniqueSessions: numberValue(row, "unique_sessions"),
      zeroResultCount: numberValue(row, "zero_result_count"),
    })),
  };
}

const cachedAnalyticsDetails = unstable_cache(
  queryAnalyticsDetails,
  ["analytics-details-v2"],
  { revalidate: 3600, tags: ["analytics-details"] },
);

export function getAnalyticsDetails(query: AnalyticsDetailsQuery): Promise<AnalyticsDetailsResult> {
  return cachedAnalyticsDetails(
    query.range,
    query.countryMode,
    query.country,
    query.device,
    query.browser,
    query.os,
    query.tab,
    query.page,
    query.search,
    query.sort,
    query.direction,
  );
}

export { PAGE_SIZE as ANALYTICS_DETAILS_PAGE_SIZE };
