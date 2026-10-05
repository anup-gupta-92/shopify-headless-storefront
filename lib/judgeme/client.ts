import "server-only";
import { unstable_cache } from "next/cache";
import type { ReviewPage } from "./types";
import { judgeMeExternalId } from "./product";
import {
  fetchJudgeMeReviewPage,
  JUDGEME_CACHE_OPTIONS,
  JudgeMeRequestError,
  MAX_REVIEW_PAGE,
  REVIEWS_PAGE_SIZE,
  safelyLoadJudgeMeReviewPage,
} from "./review-request";

export { REVIEWS_PAGE_SIZE };

const getCachedProductReviewPage = unstable_cache(
  async (externalId: string, page: number): Promise<ReviewPage> => {
    const shopDomain = process.env.JUDGEME_SHOP_DOMAIN;
    const apiToken = process.env.JUDGEME_PUBLIC_TOKEN;
    if (!shopDomain || !apiToken) throw new JudgeMeRequestError("configuration");

    return fetchJudgeMeReviewPage({ externalId, page, shopDomain, apiToken });
  },
  ["judgeme-product-reviews"],
  JUDGEME_CACHE_OPTIONS,
);

export async function getProductReviewPage(shopifyProductGid: string, page = 1): Promise<ReviewPage | null> {
  const externalId = judgeMeExternalId(shopifyProductGid);
  if (!externalId || !Number.isInteger(page) || page < 1 || page > MAX_REVIEW_PAGE) return null;

  // On a stale hit, Next/vinext serves the cached value and refreshes it in the
  // background. A failed refresh is not written, so the prior value remains.
  return safelyLoadJudgeMeReviewPage(
    () => getCachedProductReviewPage(externalId, page),
    { productId: externalId, page },
  );
}
