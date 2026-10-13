export const ANALYTICS_EVENT_NAMES = [
  "session_started", "page_view", "product_view", "catalog_view", "search_performed",
  "add_to_cart", "remove_from_cart", "cart_opened", "cart_quantity_changed", "checkout_started",
  "bulk_order_interaction", "purchase_option_changed", "theme_changed",
  "pwa_install_prompt_shown", "pwa_install_clicked", "pwa_install_dismissed", "pwa_installed",
  "pwa_launched_standalone",
] as const;

export const ANALYTICS_SOURCE_SURFACES = [
  "homepage_category", "homepage_best_sellers", "shop", "collection", "search_results",
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
  hasGoogleClickId?: boolean;
  hasMerchantClickId?: boolean;
}): string {
  const source = input.utmSource?.toLowerCase() ?? "";
  const medium = input.utmMedium?.toLowerCase() ?? "";
  const referrer = input.referrerHost?.toLowerCase() ?? "";
  if (input.hasMerchantClickId || source.includes("merchant")) return "google_merchant";
  if (medium.includes("shopping") || source.includes("google_shopping")) return "google_shopping";
  if (input.hasGoogleClickId || medium === "cpc" || medium === "ppc" || medium === "paid_search") return "paid_search";
  if (medium === "email" || source.includes("email")) return "email";
  if (medium === "social" || /facebook|instagram|linkedin|x\.com|twitter|tiktok/.test(referrer || source)) return "social";
  if (/chatgpt|openai|perplexity|claude|copilot/.test(referrer)) return "ai_referral";
  if (/google\.|bing\.|duckduckgo\.|yahoo\./.test(referrer)) return "organic_search";
  if (source || medium) return "unknown";
  if (referrer) return "referral";
  return "direct";
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
