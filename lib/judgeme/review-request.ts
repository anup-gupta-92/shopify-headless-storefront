import type { Review, ReviewPage } from "./types";

export const JUDGEME_REVALIDATE_SECONDS = 60 * 60 * 24;
export const JUDGEME_CACHE_OPTIONS = {
  revalidate: JUDGEME_REVALIDATE_SECONDS,
} as const;

export const JUDGEME_REQUEST_TIMEOUT_MS = 5_000;
export const REVIEWS_PAGE_SIZE = 5;
export const MAX_REVIEW_PAGE = 100;

type JudgeMeFailureCategory = "timeout" | "http" | "network" | "invalid-response" | "configuration";

interface WidgetReview {
  uuid?: unknown;
  rating?: unknown;
  title?: unknown;
  body?: unknown;
  reviewer_name?: unknown;
  is_anonymous_reviewer?: unknown;
  verified_buyer?: unknown;
  created_at?: unknown;
  pictures_urls?: unknown;
}

export class JudgeMeRequestError extends Error {
  readonly category: JudgeMeFailureCategory;
  readonly status?: number;

  constructor(category: JudgeMeFailureCategory, status?: number) {
    const suffix = status === undefined ? "" : ` (${status})`;
    super(`Judge.me product reviews ${category}${suffix}`);
    this.name = "JudgeMeRequestError";
    this.category = category;
    this.status = status;
  }
}

interface FetchReviewPageOptions {
  externalId: string;
  page: number;
  shopDomain: string;
  apiToken: string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

interface SafeReviewLoadContext {
  productId: string;
  page: number;
}

export interface JudgeMeSafeLogContext extends SafeReviewLoadContext {
  endpoint: "product_review";
  category: JudgeMeFailureCategory;
  status?: number;
}

type JudgeMeLogger = (message: string, context: JudgeMeSafeLogContext) => void;

function asText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function mapReview(raw: WidgetReview): Review | null {
  const id = asText(raw.uuid, 128);
  const rating = Number(raw.rating);
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const date = asText(raw.created_at, 40);
  return {
    id,
    rating,
    title: asText(raw.title, 250),
    body: asText(raw.body, 10_000),
    reviewerName: raw.is_anonymous_reviewer ? "Anonymous" : asText(raw.reviewer_name, 150) || "Customer",
    verifiedBuyer: raw.verified_buyer === true,
    date: date && !Number.isNaN(Date.parse(date)) ? date : "",
    images: Array.isArray(raw.pictures_urls)
      ? raw.pictures_urls
        .filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url))
        .slice(0, 5)
      : [],
  };
}

function isTimeoutError(error: unknown): boolean {
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
}

function failureContext(error: unknown, context: SafeReviewLoadContext): JudgeMeSafeLogContext {
  const safeError = error instanceof JudgeMeRequestError
    ? error
    : new JudgeMeRequestError(isTimeoutError(error) ? "timeout" : "network");
  return {
    endpoint: "product_review",
    productId: context.productId,
    page: context.page,
    category: safeError.category,
    ...(safeError.status === undefined ? {} : { status: safeError.status }),
  };
}

export async function fetchJudgeMeReviewPage({
  externalId,
  page,
  shopDomain,
  apiToken,
  fetchImpl = fetch,
  signal = AbortSignal.timeout(JUDGEME_REQUEST_TIMEOUT_MS),
}: FetchReviewPageOptions): Promise<ReviewPage> {
  const url = new URL("https://judge.me/api/v1/widgets/product_review");
  for (const [key, value] of Object.entries({
    shop_domain: shopDomain,
    api_token: apiToken,
    external_id: externalId,
    json_request: "true",
    page: String(page),
    per_page: String(REVIEWS_PAGE_SIZE),
  })) url.searchParams.set(key, value);

  let response: Response;
  try {
    // Cache the parsed result outside fetch. Keeping this URL out of vinext's
    // fetch cache prevents its diagnostics from logging the query-string token.
    response = await fetchImpl(url, { cache: "no-store", signal });
  } catch (error) {
    throw new JudgeMeRequestError(isTimeoutError(error) ? "timeout" : "network");
  }

  if (!response.ok) throw new JudgeMeRequestError("http", response.status);

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new JudgeMeRequestError("invalid-response");
  }

  if (!data || typeof data !== "object" || !("reviews" in data) || !Array.isArray(data.reviews)) {
    throw new JudgeMeRequestError("invalid-response");
  }

  const result = data as { reviews: WidgetReview[]; total_pages?: unknown };
  const totalPages = Number(result.total_pages);
  if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > MAX_REVIEW_PAGE) {
    throw new JudgeMeRequestError("invalid-response");
  }

  return {
    reviews: result.reviews.map(mapReview).filter((review): review is Review => review !== null),
    page,
    totalPages,
  };
}

export async function safelyLoadJudgeMeReviewPage(
  load: () => Promise<ReviewPage>,
  context: SafeReviewLoadContext,
  logger: JudgeMeLogger = console.warn,
): Promise<ReviewPage | null> {
  try {
    return await load();
  } catch (error) {
    // Never log the caught error or request URL: either may contain credentials.
    logger("Judge.me reviews temporarily unavailable", failureContext(error, context));
    return null;
  }
}
