import {
  ANALYTICS_MAX_BATCH_SIZE,
  ANALYTICS_MAX_PROPERTIES_BYTES,
  ANALYTICS_MAX_SEARCH_CHARACTERS,
  isAnalyticsEventName,
  isAnalyticsSourceSurface,
  jsonByteLength,
  unicodeLength,
  type AnalyticsBatchPayload,
  type AnalyticsEventInput,
  type AnalyticsSessionContext,
} from "./first-party-shared.ts";

const ID_MAX = 128;
const TEXT_MAX = 256;
const PATH_MAX = 1024;
const THEME_VALUES = new Set(["light", "dark"]);
const THEME_SOURCE_VALUES = new Set(["default_system", "stored_system", "stored_explicit"]);
const DEVICE_VALUES = new Set(["desktop", "mobile", "tablet", "unknown"]);
const ACQUISITION_VALUES = new Set([
  "direct", "organic_search", "paid_search", "google_shopping", "google_merchant",
  "ai_referral", "referral", "email", "social", "unknown",
]);
const CLICK_ID_VALUES = new Set(["gclid", "gbraid", "wbraid", "srsltid", "multiple"]);

function text(value: unknown, max = TEXT_MAX): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") throw new Error("invalid_text");
  const normalized = value.trim();
  if (!normalized || unicodeLength(normalized) > max) throw new Error("invalid_text");
  return normalized;
}

function integer(value: unknown, min: number, max: number): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (!Number.isSafeInteger(value) || (value as number) < min || (value as number) > max) throw new Error("invalid_number");
  return value as number;
}

function validateProperties(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_properties");
  if (jsonByteLength(value) > ANALYTICS_MAX_PROPERTIES_BYTES) throw new Error("properties_too_large");
  const result = value as Record<string, unknown>;
  if (typeof result.query === "string" && unicodeLength(result.query) > ANALYTICS_MAX_SEARCH_CHARACTERS) {
    throw new Error("search_query_too_long");
  }
  return result;
}

function validateSession(value: unknown, nowSeconds: number): AnalyticsSessionContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_session");
  const candidate = value as Record<string, unknown>;
  const startedAt = integer(candidate.startedAt, nowSeconds - 60 * 60 * 24 * 30, nowSeconds + 300);
  const lastSeenAt = integer(candidate.lastSeenAt, nowSeconds - 60 * 60 * 24 * 30, nowSeconds + 300);
  if (startedAt === undefined || lastSeenAt === undefined || lastSeenAt < startedAt) throw new Error("invalid_session_time");
  const deviceType = text(candidate.deviceType, 16);
  const initialTheme = text(candidate.initialTheme, 8);
  const currentTheme = text(candidate.currentTheme, 8);
  const themeSource = text(candidate.themeSource, 32);
  if (deviceType && !DEVICE_VALUES.has(deviceType)) throw new Error("invalid_device");
  if (initialTheme && !THEME_VALUES.has(initialTheme)) throw new Error("invalid_theme");
  if (currentTheme && !THEME_VALUES.has(currentTheme)) throw new Error("invalid_theme");
  if (themeSource && !THEME_SOURCE_VALUES.has(themeSource)) throw new Error("invalid_theme_source");

  const sessionId = text(candidate.sessionId, ID_MAX);
  const visitorId = text(candidate.visitorId, ID_MAX);
  if (!sessionId || !visitorId) throw new Error("invalid_session_id");
  const acquisitionChannel = text(candidate.acquisitionChannel, 32);
  if (acquisitionChannel && !ACQUISITION_VALUES.has(acquisitionChannel)) throw new Error("invalid_acquisition_channel");
  const hasClickId = candidate.hasClickId === 1 ? 1 : 0;
  const clickIdType = text(candidate.clickIdType, 32);
  if (clickIdType && !CLICK_ID_VALUES.has(clickIdType)) throw new Error("invalid_click_id_type");
  if ((hasClickId === 0 && clickIdType) || (hasClickId === 1 && !clickIdType)) throw new Error("invalid_click_id_state");
  return {
    sessionId,
    visitorId,
    startedAt,
    lastSeenAt,
    browserName: text(candidate.browserName, 64),
    browserVersionMajor: text(candidate.browserVersionMajor, 16),
    osName: text(candidate.osName, 64),
    osVersionMajor: text(candidate.osVersionMajor, 16),
    deviceType: deviceType as AnalyticsSessionContext["deviceType"],
    language: text(candidate.language, 32),
    landingPath: text(candidate.landingPath, PATH_MAX),
    referrerHost: text(candidate.referrerHost, 255),
    utmSource: text(candidate.utmSource),
    utmMedium: text(candidate.utmMedium),
    utmCampaign: text(candidate.utmCampaign),
    utmContent: text(candidate.utmContent),
    utmTerm: text(candidate.utmTerm),
    acquisitionChannel,
    hasClickId,
    clickIdType,
    isPwa: candidate.isPwa === 1 ? 1 : 0,
    initialTheme: initialTheme as AnalyticsSessionContext["initialTheme"],
    currentTheme: currentTheme as AnalyticsSessionContext["currentTheme"],
    themeSource: themeSource as AnalyticsSessionContext["themeSource"],
  };
}

function validateEvent(value: unknown, nowSeconds: number): AnalyticsEventInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_event");
  const candidate = value as Record<string, unknown>;
  if (!isAnalyticsEventName(candidate.eventName)) throw new Error("unsupported_event");
  const sourceSurface = candidate.sourceSurface;
  if (sourceSurface !== undefined && !isAnalyticsSourceSurface(sourceSurface)) throw new Error("invalid_source_surface");
  const occurredAt = integer(candidate.occurredAt, nowSeconds - 60 * 60 * 24 * 30, nowSeconds + 300);
  if (occurredAt === undefined) throw new Error("invalid_event_time");
  const currency = text(candidate.currency, 3)?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new Error("invalid_currency");
  const properties = validateProperties(candidate.properties);
  const pagePath = text(candidate.pagePath, PATH_MAX);
  if (pagePath && (!pagePath.startsWith("/") || pagePath.startsWith("//"))) throw new Error("invalid_page_path");
  if (candidate.eventName === "search_performed") {
    if (typeof properties?.query !== "string" || unicodeLength(properties.query.trim()) < 2) throw new Error("invalid_search_query");
    if (integer(properties.result_count, 0, 1_000_000) === undefined) throw new Error("invalid_result_count");
  }
  const eventId = text(candidate.eventId, ID_MAX);
  if (!eventId) throw new Error("invalid_event_id");
  return {
    eventId,
    eventName: candidate.eventName,
    occurredAt,
    pagePath,
    pageType: text(candidate.pageType, 32),
    sourceSurface,
    productId: text(candidate.productId, ID_MAX),
    productHandle: text(candidate.productHandle, TEXT_MAX),
    variantId: text(candidate.variantId, ID_MAX),
    sku: text(candidate.sku, TEXT_MAX),
    quantity: integer(candidate.quantity, 0, 1_000_000),
    valueMinor: integer(candidate.valueMinor, 0, Number.MAX_SAFE_INTEGER),
    currency,
    properties,
  };
}

export function validateAnalyticsBatch(value: unknown, nowSeconds = Math.floor(Date.now() / 1000)): AnalyticsBatchPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_payload");
  const candidate = value as Record<string, unknown>;
  if (!Array.isArray(candidate.events) || candidate.events.length < 1 || candidate.events.length > ANALYTICS_MAX_BATCH_SIZE) {
    throw new Error("invalid_batch_size");
  }
  return {
    session: validateSession(candidate.session, nowSeconds),
    events: candidate.events.map((event) => validateEvent(event, nowSeconds)),
  };
}

export function validateConsentAggregate(value: unknown): {
  decision: "accepted" | "rejected" | "custom";
  analyticsAllowed: 0 | 1;
  marketingAllowed: 0 | 1;
  action: "initial" | "changed";
} {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid_payload");
  const candidate = value as Record<string, unknown>;
  if (!new Set(["accepted", "rejected", "custom"]).has(String(candidate.decision))) throw new Error("invalid_decision");
  if (!new Set(["initial", "changed"]).has(String(candidate.action))) throw new Error("invalid_action");
  if (typeof candidate.analyticsAllowed !== "boolean" || typeof candidate.marketingAllowed !== "boolean") throw new Error("invalid_consent");
  if (candidate.decision === "accepted" && (!candidate.analyticsAllowed || !candidate.marketingAllowed)) throw new Error("invalid_consent_decision");
  if (candidate.decision === "rejected" && (candidate.analyticsAllowed || candidate.marketingAllowed)) throw new Error("invalid_consent_decision");
  if (candidate.decision === "custom" && candidate.analyticsAllowed === candidate.marketingAllowed) throw new Error("invalid_consent_decision");
  return {
    decision: candidate.decision as "accepted" | "rejected" | "custom",
    analyticsAllowed: candidate.analyticsAllowed ? 1 : 0,
    marketingAllowed: candidate.marketingAllowed ? 1 : 0,
    action: candidate.action as "initial" | "changed",
  };
}
