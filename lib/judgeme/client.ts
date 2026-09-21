import "server-only";
import type { Review, ReviewPage } from "./types";
import { judgeMeExternalId } from "./product";

export const REVIEWS_PAGE_SIZE = 5;
const MAX_PAGE = 100;

interface WidgetReview {
  uuid?: unknown; rating?: unknown; title?: unknown; body?: unknown;
  reviewer_name?: unknown; is_anonymous_reviewer?: unknown;
  verified_buyer?: unknown; created_at?: unknown; pictures_urls?: unknown;
}

function asText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function mapReview(raw: WidgetReview): Review | null {
  const id = asText(raw.uuid, 128);
  const rating = Number(raw.rating);
  if (!id || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  const date = asText(raw.created_at, 40);
  return {
    id, rating,
    title: asText(raw.title, 250),
    body: asText(raw.body, 10000),
    reviewerName: raw.is_anonymous_reviewer ? "Anonymous" : asText(raw.reviewer_name, 150) || "Customer",
    verifiedBuyer: raw.verified_buyer === true,
    date: date && !Number.isNaN(Date.parse(date)) ? date : "",
    images: Array.isArray(raw.pictures_urls)
      ? raw.pictures_urls.filter((url): url is string => typeof url === "string" && /^https:\/\//.test(url)).slice(0, 5)
      : [],
  };
}

export async function getProductReviewPage(shopifyProductGid: string, page = 1): Promise<ReviewPage | null> {
  const externalId = judgeMeExternalId(shopifyProductGid);
  const domain = process.env.JUDGEME_SHOP_DOMAIN;
  const token = process.env.JUDGEME_PUBLIC_TOKEN;
  if (!externalId || !domain || !token || !Number.isInteger(page) || page < 1 || page > MAX_PAGE) return null;

  const url = new URL("https://judge.me/api/v1/widgets/product_review");
  for (const [key, value] of Object.entries({
    shop_domain: domain, api_token: token, external_id: externalId,
    json_request: "true", page: String(page), per_page: String(REVIEWS_PAGE_SIZE),
  })) url.searchParams.set(key, value);

  try {
    const response = await fetch(url, { next: { revalidate: 300 }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("reviews" in data) || !Array.isArray(data.reviews)) throw new Error("Invalid response");
    const result = data as { reviews: WidgetReview[]; total_pages?: unknown; current_page?: unknown };
    const totalPages = Number(result.total_pages);
    if (!Number.isSafeInteger(totalPages) || totalPages < 0 || totalPages > MAX_PAGE) throw new Error("Invalid pagination");
    return { reviews: result.reviews.map(mapReview).filter((review): review is Review => review !== null), page, totalPages };
  } catch {
    // Review availability must never determine whether Shopify products render.
    console.warn("Judge.me reviews temporarily unavailable");
    return null;
  }
}
