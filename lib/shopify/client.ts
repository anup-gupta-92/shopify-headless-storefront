import "server-only";
import {
  getShopifyStoreDomain,
  getShopifyStorefrontApiVersion,
  getShopifyStorefrontPrivateToken,
} from "./config";

export const CATALOG_REVALIDATE_SECONDS = 300;

interface StorefrontRequestOptions {
  buyerIp?: string;
  cache?: "no-store";
}

export async function storefrontRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
  options: StorefrontRequestOptions = {},
): Promise<T> {
  const domain = getShopifyStoreDomain();
  const token = getShopifyStorefrontPrivateToken();
  const version = getShopifyStorefrontApiVersion();
  let response: Response;
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Shopify-Storefront-Private-Token": token,
    };
    if (options.buyerIp) headers["Shopify-Storefront-Buyer-IP"] = options.buyerIp;

    response = await fetch(`https://${domain}/api/${version}/graphql.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({ query, variables }),
      ...(options.cache === "no-store"
        ? { cache: "no-store" as const }
        : { next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["shopify-catalog"] } }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Shopify Storefront request failed or timed out");
  }
  if (!response.ok) throw new Error(`Shopify Storefront HTTP error (${response.status})`);
  let result: { data?: T; errors?: unknown[] };
  try { result = await response.json(); } catch { throw new Error("Shopify Storefront returned invalid JSON"); }
  // Never forward Shopify's raw response or request headers into errors/logs.
  if (result.errors?.length) throw new Error("Shopify Storefront GraphQL request failed; check query fields and API permissions");
  if (!result.data) throw new Error("Shopify Storefront returned no data");
  return result.data;
}
