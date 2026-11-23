export const ANALYTICS_EVENT_NAMES = [
  "session_started", "page_view", "404_view", "product_view", "product_hotspot_clicked", "product_share_clicked", "catalog_view", "search_performed",
  "add_to_cart", "remove_from_cart", "cart_opened", "cart_quantity_changed", "checkout_started",
  "bulk_order_interaction", "purchase_option_changed", "theme_changed",
  "pwa_install_prompt_shown", "pwa_install_clicked", "pwa_install_dismissed", "pwa_installed",
  "pwa_launched_standalone",
] as const;

export const ANALYTICS_SOURCE_SURFACES = [
  "homepage_category", "homepage_best_sellers", "homepage_tagged_image", "shop", "collection", "search_results",
  "header_search", "product_page", "recommendations", "bulk_table", "cart_drawer", "cart_page",
  "buy_again", "header", "site",
] as const;

export type AnalyticsEventName = typeof ANALYTICS_EVENT_NAMES[number];
export type AnalyticsSourceSurface = typeof ANALYTICS_SOURCE_SURFACES[number];
export type AnalyticsTheme = "light" | "dark";
export type AnalyticsThemeSource = "default_system" | "stored_system" | "stored_explicit";

export const ANALYTICS_MAX_BATCH_SIZE = 20;
export const ANALYTICS_MAX_REQUEST_BYTES = 64 * 1024;
export const ANALYTICS_MAX_PROPERTIES_BYTES = 4 * 1024;
export const ANALYTICS_MAX_SEARCH_CHARACTERS = 200;
export const ANALYTICS_SESSION_TIMEOUT_MS = 30 * 60 * 1000;

export interface AnalyticsSessionContext {
  sessionId: string;
  visitorId: string;
  startedAt: number;
  lastSeenAt: number;
  browserName?: string;
  browserVersionMajor?: string;
  osName?: string;
  osVersionMajor?: string;
  deviceType?: "desktop" | "mobile" | "tablet" | "unknown";
  language?: string;
  landingPath?: string;
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  acquisitionChannel?: string;
  hasClickId: 0 | 1;
  clickIdType?: string;
  isPwa: 0 | 1;
  initialTheme?: AnalyticsTheme;
  currentTheme?: AnalyticsTheme;
  themeSource?: AnalyticsThemeSource;
}

export interface AnalyticsEventInput {
  eventId: string;
  eventName: AnalyticsEventName;
  occurredAt: number;
  pagePath?: string;
  pageType?: string;
  sourceSurface?: AnalyticsSourceSurface;
  productId?: string;
  productHandle?: string;
  variantId?: string;
  sku?: string;
  quantity?: number;
  valueMinor?: number;
  currency?: string;
  properties?: Record<string, unknown>;
}

export interface AnalyticsBatchPayload {
  session: AnalyticsSessionContext;
  events: AnalyticsEventInput[];
}

const eventNames = new Set<string>(ANALYTICS_EVENT_NAMES);
const sourceSurfaces = new Set<string>(ANALYTICS_SOURCE_SURFACES);

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && eventNames.has(value);
}

export function isAnalyticsSourceSurface(value: unknown): value is AnalyticsSourceSurface {
  return typeof value === "string" && sourceSurfaces.has(value);
}

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function jsonByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

export function isSessionExpired(lastSeenAtMs: number, nowMs: number): boolean {
  return !Number.isFinite(lastSeenAtMs) || nowMs - lastSeenAtMs >= ANALYTICS_SESSION_TIMEOUT_MS;
}

export function shouldCollectAnalytics(input: {
  hostname: string;
  localEnabled: boolean;
  analyticsConsent: boolean;
  internallyExcluded: boolean;
}): boolean {
  const productionHost = input.hostname === "apexbusinesssupplies.co.uk" || input.hostname === "www.apexbusinesssupplies.co.uk";
  return (productionHost || input.localEnabled) && input.analyticsConsent && !input.internallyExcluded;
}

export function classifyAcquisition(input: {
  referrerHost?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  hasGoogleClickId?: boolean;
  hasMerchantClickId?: boolean;
}): string {
  const source = input.utmSource?.toLowerCase() ?? "";
  const medium = input.utmMedium?.toLowerCase() ?? "";
  const campaign = input.utmCampaign?.toLowerCase() ?? "";
  const referrer = input.referrerHost?.toLowerCase() ?? "";
  const hasPaidSearchEvidence = input.hasGoogleClickId
    || medium === "cpc"
    || medium === "ppc"
    || medium === "paid_search";
  const hasShoppingEvidence = medium.includes("shopping")
    || source.includes("google_shopping")
    || (source === "google" && medium === "product_sync" && campaign === "sag_organic");

  // A paid Google click ID is stronger evidence than srsltid, which can be
  // present on unpaid Merchant/free-listing traffic. Shopify's product-sync
  // UTMs identify the feed context, but only become paid Shopping attribution
  // when paired with explicit paid-click evidence.
  if (hasPaidSearchEvidence && hasShoppingEvidence) return "google_shopping";
  if (hasPaidSearchEvidence) return "paid_search";
  if (input.hasMerchantClickId || source.includes("merchant") || hasShoppingEvidence) return "google_merchant";
  if (medium === "email" || source.includes("email")) return "email";
  if (medium === "social" || /facebook|instagram|linkedin|x\.com|twitter|tiktok/.test(referrer || source)) return "social";
  if (/chatgpt|openai|perplexity|claude|copilot/.test(referrer)) return "ai_referral";
  if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(referrer)) return "organic_search";
  if (source || medium) return "unknown";
  if (referrer) return "referral";
  return "direct";
}

export function acquisitionChannelSql(alias: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(alias)) {
    throw new Error("invalid_analytics_sql_alias");
  }

  const column = (name: string) => `${alias}.${name}`;
  const source = `lower(COALESCE(${column("utm_source")}, ''))`;
  const medium = `lower(COALESCE(${column("utm_medium")}, ''))`;
  const campaign = `lower(COALESCE(${column("utm_campaign")}, ''))`;
  const referrer = `lower(COALESCE(${column("referrer_host")}, ''))`;
  const socialSource = `(CASE WHEN ${referrer} <> '' THEN ${referrer} ELSE ${source} END)`;
  const paidClick = `${column("click_id_type")} IN ('gclid', 'gbraid', 'wbraid', 'multiple')`;
  const paidSearch = `(${paidClick} OR ${medium} IN ('cpc', 'ppc', 'paid_search'))`;
  const shopping = `(${medium} LIKE '%shopping%' OR ${source} LIKE '%google_shopping%' OR (${source} = 'google' AND ${medium} = 'product_sync' AND ${campaign} = 'sag_organic'))`;

  // Keep historical dashboard reads aligned with classifyAcquisition without
  // mutating stored sessions. Explicit paid-click evidence wins over srsltid.
  return `(CASE
    WHEN ${paidSearch} AND ${shopping} THEN 'google_shopping'
    WHEN ${paidSearch} THEN 'paid_search'
    WHEN ${column("click_id_type")} = 'srsltid' OR ${source} LIKE '%merchant%' OR ${shopping} THEN 'google_merchant'
    WHEN ${medium} = 'email' OR ${source} LIKE '%email%' THEN 'email'
    WHEN ${medium} = 'social' OR ${socialSource} LIKE '%facebook%' OR ${socialSource} LIKE '%instagram%' OR ${socialSource} LIKE '%linkedin%' OR ${socialSource} LIKE '%x.com%' OR ${socialSource} LIKE '%twitter%' OR ${socialSource} LIKE '%tiktok%' THEN 'social'
    WHEN ${referrer} LIKE '%chatgpt%' OR ${referrer} LIKE '%openai%' OR ${referrer} LIKE '%perplexity%' OR ${referrer} LIKE '%claude%' OR ${referrer} LIKE '%copilot%' THEN 'ai_referral'
    WHEN ${referrer} LIKE '%google.%' OR ${referrer} LIKE '%bing.%' OR ${referrer} LIKE '%duckduckgo.%' OR ${referrer} LIKE '%yahoo.%' THEN 'organic_search'
    WHEN ${source} <> '' OR ${medium} <> '' THEN 'unknown'
    WHEN ${referrer} <> '' THEN 'referral'
    ELSE 'direct'
  END)`;
}

export function pageTypeForPath(pathname: string): string {
  if (pathname === "/") return "home";
  if (pathname === "/shop") return "shop";
  if (pathname.startsWith("/collections/")) return "collection";
  if (pathname.startsWith("/products/")) return "product";
  if (pathname === "/search") return "search";
  if (pathname === "/cart") return "cart";
  if (pathname === "/blogs") return "blog_index";
  if (pathname.startsWith("/blogs/")) return "blog_article";
  return "other";
}
