import "server-only";

import { unstable_cache } from "next/cache";
import { analyticsDatabase } from "@/lib/analytics/server";
import { analyticsRangeStart } from "@/lib/analytics/dashboard";
import {
  type PaidTrafficChannel,
  type PaidTrafficQuery,
} from "@/lib/analytics/paid-traffic-shared";

type QueryRow = Record<string, string | number | null>;
type SqlFilter = { sql: string; values: Array<string | number> };

export type PaidTrafficFunnel = {
  sessions: number;
  productViewSessions: number;
  addToCartSessions: number;
  checkoutStartSessions: number;
  confirmedPurchases: null;
};

export type PaidTrafficChannelComparison = PaidTrafficFunnel & {
  channel: PaidTrafficChannel;
};

export type PaidTrafficSessionRow = {
  sessionId: string;
  startedAt: number;
  acquisitionChannel: string;
  landingPath: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  productViews: number;
  addToCartEvents: number;
  checkoutStartEvents: number;
};

export type PaidTrafficTimelineEvent = {
  eventId: string;
  eventName: string;
  occurredAt: number;
  pagePath: string | null;
  sourceSurface: string | null;
  productId: string | null;
  productHandle: string | null;
  variantId: string | null;
  sku: string | null;
  quantity: number | null;
};

export type PaidTrafficFilterOptions = {
  countries: string[];
  devices: string[];
  acquisitionChannels: string[];
  utmSources: string[];
  utmMediums: string[];
  utmCampaigns: string[];
};

export type PaidTrafficReport = {
  query: PaidTrafficQuery;
  refreshedAt: number;
  startAt: number;
  endAt: number;
  funnel: PaidTrafficFunnel;
  channelComparison: PaidTrafficChannelComparison[];
  sessions: PaidTrafficSessionRow[];
  timeline: PaidTrafficTimelineEvent[];
  selectedSession: PaidTrafficSessionRow | null;
  totalRows: number;
  totalPages: number;
  filterOptions: PaidTrafficFilterOptions;
};

const PAGE_SIZE = 25;
const comparisonChannels = [
  "paid_search",
  "google_shopping",
  "google_merchant",
  "organic_search",
  "direct",
] as const satisfies readonly PaidTrafficChannel[];

function count(row: QueryRow | undefined, key: string): number {
  const value = row?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function stringValue(row: QueryRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" && value ? value : null;
}

function sessionFilters(alias: string, query: PaidTrafficQuery, includeAcquisition = true): SqlFilter {
  const predicates: string[] = [];
  const values: string[] = [];
  if (query.countryMode === "include" && query.country) {
    predicates.push(`${alias}.country_code = ?`);
    values.push(query.country);
  } else if (query.countryMode === "exclude" && query.country) {
    predicates.push(`COALESCE(${alias}.country_code, '') <> ?`);
    values.push(query.country);
  }
  if (includeAcquisition && query.acquisition) {
    predicates.push(`COALESCE(NULLIF(${alias}.acquisition_channel, ''), 'unknown') = ?`);
    values.push(query.acquisition);
  }
  if (query.utmSource) {
    predicates.push(`COALESCE(NULLIF(${alias}.utm_source, ''), '') = ?`);
    values.push(query.utmSource);
  }
  if (query.utmMedium) {
    predicates.push(`COALESCE(NULLIF(${alias}.utm_medium, ''), '') = ?`);
    values.push(query.utmMedium);
  }
  if (query.utmCampaign) {
    predicates.push(`COALESCE(NULLIF(${alias}.utm_campaign, ''), '') = ?`);
    values.push(query.utmCampaign);
  }
  if (query.device) {
    predicates.push(`COALESCE(NULLIF(${alias}.device_type, ''), 'unknown') = ?`);
    values.push(query.device);
  }
  return { sql: predicates.length ? ` AND ${predicates.join(" AND ")}` : "", values };
}

function funnelFromRow(row: QueryRow | undefined): PaidTrafficFunnel {
  return {
    sessions: count(row, "sessions"),
    productViewSessions: count(row, "product_view_sessions"),
    addToCartSessions: count(row, "add_to_cart_sessions"),
    checkoutStartSessions: count(row, "checkout_start_sessions"),
    confirmedPurchases: null,
  };
}

function optionValues(row: QueryRow | undefined, key: string): string[] {
  const value = row?.[key];
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

async function queryPaidTrafficReport(
  range: PaidTrafficQuery["range"],
  countryMode: PaidTrafficQuery["countryMode"],
  country: string | null,
  acquisition: PaidTrafficQuery["acquisition"],
  utmSource: string | null,
  utmMedium: string | null,
  utmCampaign: string | null,
  device: PaidTrafficQuery["device"],
  page: number,
  sessionId: string | null,
): Promise<PaidTrafficReport> {
  const query: PaidTrafficQuery = {
    range, countryMode, country, acquisition, utmSource, utmMedium, utmCampaign, device, page, sessionId,
  };
  const refreshedAt = Math.floor(Date.now() / 1000);
  const startAt = analyticsRangeStart(range, refreshedAt);
  const endAt = refreshedAt + 1;
  const offset = (page - 1) * PAGE_SIZE;
  const db = await analyticsDatabase();
  const filtered = sessionFilters("s", query);
  const comparisonFilter = sessionFilters("s", query, false);

  const activityCte = `
    WITH filtered_sessions AS (
      SELECT s.* FROM analytics_sessions AS s
      WHERE s.started_at >= ? AND s.started_at < ?${filtered.sql}
    ), session_activity AS (
      SELECT
        s.session_id,
        MAX(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END) AS has_product_view,
        MAX(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS has_add_to_cart,
        MAX(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END) AS has_checkout_start
      FROM filtered_sessions AS s
      LEFT JOIN analytics_events AS e
        ON e.session_id = s.session_id
        AND e.occurred_at >= ? AND e.occurred_at < ?
        AND e.event_name IN ('product_view', 'add_to_cart', 'checkout_started')
      GROUP BY s.session_id
    )`;

  const statements: D1PreparedStatement[] = [
    db.prepare(`${activityCte}
      SELECT
        COUNT(*) AS sessions,
        COALESCE(SUM(has_product_view), 0) AS product_view_sessions,
        COALESCE(SUM(has_add_to_cart), 0) AS add_to_cart_sessions,
        COALESCE(SUM(has_checkout_start), 0) AS checkout_start_sessions
      FROM session_activity
    `).bind(startAt, endAt, ...filtered.values, startAt, endAt),
    db.prepare(`
      WITH filtered_sessions AS (
        SELECT s.* FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${comparisonFilter.sql}
          AND COALESCE(NULLIF(s.acquisition_channel, ''), 'unknown') IN (${comparisonChannels.map(() => "?").join(", ")})
      ), session_activity AS (
        SELECT
          s.session_id,
          COALESCE(NULLIF(s.acquisition_channel, ''), 'unknown') AS channel,
          MAX(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END) AS has_product_view,
          MAX(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END) AS has_add_to_cart,
          MAX(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END) AS has_checkout_start
        FROM filtered_sessions AS s
        LEFT JOIN analytics_events AS e
          ON e.session_id = s.session_id
          AND e.occurred_at >= ? AND e.occurred_at < ?
          AND e.event_name IN ('product_view', 'add_to_cart', 'checkout_started')
        GROUP BY s.session_id, channel
      )
      SELECT
        channel,
        COUNT(*) AS sessions,
        COALESCE(SUM(has_product_view), 0) AS product_view_sessions,
        COALESCE(SUM(has_add_to_cart), 0) AS add_to_cart_sessions,
        COALESCE(SUM(has_checkout_start), 0) AS checkout_start_sessions
      FROM session_activity
      GROUP BY channel
      ORDER BY sessions DESC, channel ASC
    `).bind(
      startAt, endAt, ...comparisonFilter.values, ...comparisonChannels, startAt, endAt,
    ),
    db.prepare(`
      SELECT
        (SELECT json_group_array(label) FROM (
          SELECT country_code AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? AND country_code IS NOT NULL AND country_code <> ''
          GROUP BY country_code ORDER BY country_code
        )) AS countries,
        (SELECT json_group_array(label) FROM (
          SELECT COALESCE(NULLIF(device_type, ''), 'unknown') AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? GROUP BY label ORDER BY label
        )) AS devices,
        (SELECT json_group_array(label) FROM (
          SELECT COALESCE(NULLIF(acquisition_channel, ''), 'unknown') AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? GROUP BY label ORDER BY label
        )) AS acquisition_channels,
        (SELECT json_group_array(label) FROM (
          SELECT utm_source AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? AND utm_source IS NOT NULL AND utm_source <> ''
          GROUP BY utm_source ORDER BY utm_source
        )) AS utm_sources,
        (SELECT json_group_array(label) FROM (
          SELECT utm_medium AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? AND utm_medium IS NOT NULL AND utm_medium <> ''
          GROUP BY utm_medium ORDER BY utm_medium
        )) AS utm_mediums,
        (SELECT json_group_array(label) FROM (
          SELECT utm_campaign AS label FROM analytics_sessions
          WHERE started_at >= ? AND started_at < ? AND utm_campaign IS NOT NULL AND utm_campaign <> ''
          GROUP BY utm_campaign ORDER BY utm_campaign
        )) AS utm_campaigns
    `).bind(
      startAt, endAt, startAt, endAt, startAt, endAt,
      startAt, endAt, startAt, endAt, startAt, endAt,
    ),
    db.prepare(`
      WITH filtered_sessions AS (
        SELECT s.* FROM analytics_sessions AS s
        WHERE s.started_at >= ? AND s.started_at < ?${filtered.sql}
      )
      SELECT
        s.session_id, s.started_at,
        COALESCE(NULLIF(s.acquisition_channel, ''), 'unknown') AS acquisition_channel,
        COALESCE(NULLIF(s.landing_path, ''), '/') AS landing_path,
        s.utm_source, s.utm_medium, s.utm_campaign,
        COALESCE(SUM(CASE WHEN e.event_name = 'product_view' THEN 1 ELSE 0 END), 0) AS product_views,
        COALESCE(SUM(CASE WHEN e.event_name = 'add_to_cart' THEN 1 ELSE 0 END), 0) AS add_to_cart_events,
        COALESCE(SUM(CASE WHEN e.event_name = 'checkout_started' THEN 1 ELSE 0 END), 0) AS checkout_start_events
      FROM filtered_sessions AS s
      LEFT JOIN analytics_events AS e
        ON e.session_id = s.session_id
        AND e.occurred_at >= ? AND e.occurred_at < ?
        AND e.event_name IN ('product_view', 'add_to_cart', 'checkout_started')
      GROUP BY s.session_id
      ORDER BY s.started_at DESC, s.session_id ASC
      LIMIT ? OFFSET ?
    `).bind(startAt, endAt, ...filtered.values, startAt, endAt, PAGE_SIZE, offset),
    db.prepare(`
      SELECT COUNT(*) AS total
      FROM analytics_sessions AS s
      WHERE s.started_at >= ? AND s.started_at < ?${filtered.sql}
    `).bind(startAt, endAt, ...filtered.values),
  ];

  if (sessionId) {
    statements.push(db.prepare(`
      SELECT
        e.event_id, e.event_name, e.occurred_at, e.page_path, e.source_surface,
        e.product_id, e.product_handle, e.variant_id, e.sku, e.quantity
      FROM analytics_events AS e
      INNER JOIN analytics_sessions AS s ON s.session_id = e.session_id
      WHERE s.session_id = ? AND s.started_at >= ? AND s.started_at < ?${filtered.sql}
      ORDER BY e.occurred_at ASC, e.received_at ASC, e.event_id ASC
      LIMIT 100
    `).bind(sessionId, startAt, endAt, ...filtered.values));
  }

  const results = await db.batch<QueryRow>(statements);
  if (results.some((result) => !result.success)) throw new Error("Paid traffic analytics query failed");
  const [funnelResult, comparisonResult, optionsResult, sessionsResult, countResult, timelineResult] = results;
  const sessionRows: PaidTrafficSessionRow[] = sessionsResult.results.flatMap((row) => {
    const rowSessionId = stringValue(row, "session_id");
    if (!rowSessionId) return [];
    return [{
      sessionId: rowSessionId,
      startedAt: count(row, "started_at"),
      acquisitionChannel: stringValue(row, "acquisition_channel") ?? "unknown",
      landingPath: stringValue(row, "landing_path") ?? "/",
      utmSource: stringValue(row, "utm_source"),
      utmMedium: stringValue(row, "utm_medium"),
      utmCampaign: stringValue(row, "utm_campaign"),
      productViews: count(row, "product_views"),
      addToCartEvents: count(row, "add_to_cart_events"),
      checkoutStartEvents: count(row, "checkout_start_events"),
    }];
  });
  const totalRows = count(countResult.results[0], "total");

  return {
    query,
    refreshedAt,
    startAt,
    endAt,
    funnel: funnelFromRow(funnelResult.results[0]),
    channelComparison: comparisonResult.results.flatMap((row) => {
      const channel = stringValue(row, "channel");
      return channel && (comparisonChannels as readonly string[]).includes(channel)
        ? [{ channel: channel as PaidTrafficChannel, ...funnelFromRow(row) }]
        : [];
    }),
    sessions: sessionRows,
    timeline: (timelineResult?.results ?? []).flatMap((row) => {
      const eventId = stringValue(row, "event_id");
      const eventName = stringValue(row, "event_name");
      if (!eventId || !eventName) return [];
      return [{
        eventId,
        eventName,
        occurredAt: count(row, "occurred_at"),
        pagePath: stringValue(row, "page_path"),
        sourceSurface: stringValue(row, "source_surface"),
        productId: stringValue(row, "product_id"),
        productHandle: stringValue(row, "product_handle"),
        variantId: stringValue(row, "variant_id"),
        sku: stringValue(row, "sku"),
        quantity: typeof row.quantity === "number" ? row.quantity : null,
      }];
    }),
    selectedSession: sessionId
      ? sessionRows.find((session) => session.sessionId === sessionId) ?? null
      : null,
    totalRows,
    totalPages: Math.max(1, Math.ceil(totalRows / PAGE_SIZE)),
    filterOptions: {
      countries: optionValues(optionsResult.results[0], "countries"),
      devices: optionValues(optionsResult.results[0], "devices"),
      acquisitionChannels: optionValues(optionsResult.results[0], "acquisition_channels"),
      utmSources: optionValues(optionsResult.results[0], "utm_sources"),
      utmMediums: optionValues(optionsResult.results[0], "utm_mediums"),
      utmCampaigns: optionValues(optionsResult.results[0], "utm_campaigns"),
    },
  };
}

const cachedPaidTrafficReport = unstable_cache(
  queryPaidTrafficReport,
  ["analytics-paid-traffic-v1"],
  { revalidate: 3600, tags: ["analytics-paid-traffic"] },
);

export function getPaidTrafficReport(query: PaidTrafficQuery): Promise<PaidTrafficReport> {
  return cachedPaidTrafficReport(
    query.range,
    query.countryMode,
    query.country,
    query.acquisition,
    query.utmSource,
    query.utmMedium,
    query.utmCampaign,
    query.device,
    query.page,
    query.sessionId,
  );
}

export { PAGE_SIZE as PAID_TRAFFIC_PAGE_SIZE };
