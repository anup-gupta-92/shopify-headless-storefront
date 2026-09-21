import type { ReviewRating } from "./types";

export interface RatingMetafields {
  reviewRating?: { value: string } | null;
  reviewCount?: { value: string } | null;
}

// Judge.me publishes these standard Shopify review metafields. They arrive in
// the existing product queries, so a grid never makes one Judge.me call/card.
export function ratingFromMetafields(product: RatingMetafields): ReviewRating | undefined {
  if (!process.env.JUDGEME_SHOP_DOMAIN || !process.env.JUDGEME_PUBLIC_TOKEN) return undefined;
  const count = Number(product.reviewCount?.value);
  if (!Number.isSafeInteger(count) || count <= 0) return undefined;
  try {
    const rating: unknown = JSON.parse(product.reviewRating?.value ?? "");
    if (!rating || typeof rating !== "object" || !("value" in rating)) return undefined;
    const average = Number(rating.value);
    return Number.isFinite(average) && average >= 1 && average <= 5 ? { average, count } : undefined;
  } catch {
    return undefined;
  }
}

// Judge.me's `external_id` is the numeric Shopify product ID, not its own
// internal product ID. Never derive it from a handle or a variant GID.
export function judgeMeExternalId(shopifyProductGid: string): string | null {
  const match = /^gid:\/\/shopify\/Product\/([1-9]\d*)$/.exec(shopifyProductGid);
  return match?.[1] ?? null;
}
