export const PAID_TRAFFIC_RANGES = ["7d", "15d", "30d", "60d", "90d"] as const;
export type PaidTrafficRange = (typeof PAID_TRAFFIC_RANGES)[number];

export const PAID_TRAFFIC_CHANNELS = [
  "paid_search",
  "google_shopping",
  "google_merchant",
  "organic_search",
  "direct",
  "referral",
  "email",
  "social",
  "ai_referral",
  "unknown",
] as const;
export type PaidTrafficChannel = (typeof PAID_TRAFFIC_CHANNELS)[number];
export type PaidTrafficCountryMode = "all" | "include" | "exclude";

export type PaidTrafficQuery = {
  range: PaidTrafficRange;
  countryMode: PaidTrafficCountryMode;
  country: string | null;
  acquisition: PaidTrafficChannel | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  device: "mobile" | "desktop" | "tablet" | "unknown" | null;
  page: number;
  sessionId: string | null;
};

export type PaidTrafficSearchValue = string | string[] | undefined;

const deviceValues = new Set(["mobile", "desktop", "tablet", "unknown"]);
const channelValues = new Set<string>(PAID_TRAFFIC_CHANNELS);

function firstValue(value: PaidTrafficSearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function cleanDimension(value: PaidTrafficSearchValue, maximum = 128): string | null {
  const candidate = firstValue(value)?.trim();
  return candidate && candidate.length <= maximum ? candidate : null;
}

export function parsePaidTrafficQuery(
  searchParams: Record<string, PaidTrafficSearchValue>,
): PaidTrafficQuery {
  const requestedRange = firstValue(searchParams.range);
  const range = PAID_TRAFFIC_RANGES.includes(requestedRange as PaidTrafficRange)
    ? requestedRange as PaidTrafficRange
    : "30d";
  const combinedCountry = firstValue(searchParams.countryFilter)?.trim();
  const countryMatch = combinedCountry?.match(/^(include|exclude):([A-Za-z]{2})$/);
  const country = countryMatch ? countryMatch[2].toUpperCase() : null;
  const countryMode = countryMatch ? countryMatch[1] as PaidTrafficCountryMode : "all";
  const requestedAcquisition = firstValue(searchParams.acquisition)?.trim();
  const acquisition = requestedAcquisition === "all"
    ? null
    : channelValues.has(requestedAcquisition ?? "")
      ? requestedAcquisition as PaidTrafficChannel
      : "paid_search";
  const requestedDevice = firstValue(searchParams.device)?.trim().toLowerCase();
  const requestedPage = Number.parseInt(firstValue(searchParams.page) ?? "1", 10);
  const sessionId = cleanDimension(searchParams.session, 128);

  return {
    range,
    countryMode,
    country,
    acquisition,
    utmSource: cleanDimension(searchParams.utmSource, 256),
    utmMedium: cleanDimension(searchParams.utmMedium, 256),
    utmCampaign: cleanDimension(searchParams.utmCampaign, 256),
    device: deviceValues.has(requestedDevice ?? "")
      ? requestedDevice as PaidTrafficQuery["device"]
      : null,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? Math.min(requestedPage, 10_000) : 1,
    sessionId,
  };
}

export function paidTrafficQueryString(query: PaidTrafficQuery): string {
  const params = new URLSearchParams({ range: query.range });
  params.set("acquisition", query.acquisition ?? "all");
  if (query.countryMode !== "all" && query.country) {
    params.set("countryFilter", `${query.countryMode}:${query.country}`);
  }
  if (query.utmSource) params.set("utmSource", query.utmSource);
  if (query.utmMedium) params.set("utmMedium", query.utmMedium);
  if (query.utmCampaign) params.set("utmCampaign", query.utmCampaign);
  if (query.device) params.set("device", query.device);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.sessionId) params.set("session", query.sessionId);
  return params.toString();
}

export function funnelRate(value: number, denominator: number): number | null {
  return denominator > 0 ? value / denominator : null;
}
