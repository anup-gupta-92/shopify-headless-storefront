import "server-only";

export const CATALOG_REVALIDATE_SECONDS = 300;

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Shopify environment variable: ${name}`);
  return value;
}

export async function storefrontRequest<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = requiredEnv("SHOPIFY_STORE_DOMAIN").replace(/^https:\/\//, "").replace(/\/$/, "");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) throw new Error("Invalid SHOPIFY_STORE_DOMAIN: expected a hostname");
  const token = requiredEnv("SHOPIFY_STOREFRONT_PRIVATE_TOKEN");
  const version = requiredEnv("SHOPIFY_STOREFRONT_API_VERSION");
  if (!/^\d{4}-\d{2}$/.test(version)) throw new Error("Invalid SHOPIFY_STOREFRONT_API_VERSION: expected YYYY-MM");
  let response: Response;
  try {
    response = await fetch(`https://${domain}/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Shopify-Storefront-Private-Token": token },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: ["shopify-catalog"] },
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
