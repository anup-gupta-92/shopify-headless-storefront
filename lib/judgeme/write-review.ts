import "server-only";
import { judgeMeExternalId } from "./product";

export function getJudgeMeWriteReviewUrl(shopifyProductGid: string): string | null {
  const productId = judgeMeExternalId(shopifyProductGid);
  const domain = process.env.SHOPIFY_STORE_DOMAIN?.trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");
  if (!productId || !domain || !/^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) return null;

  const url = new URL("https://api.judge.me/storefront_reviews/new");
  url.searchParams.set("shop_domain", domain);
  url.searchParams.set("platform", "shopify");
  url.searchParams.set("product_id", productId);
  url.searchParams.set("template_locale", "en");
  return url.toString();
}
