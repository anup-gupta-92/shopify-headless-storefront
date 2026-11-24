import "server-only";

import {
  getShopifyAdminApiVersion,
  getShopifyAdminClientId,
  getShopifyAdminClientSecret,
  getShopifyStoreDomain,
} from "./config";
import {
  parseShopifyAdminAccessToken,
  shopifyAdminTokenIsUsable,
  type ShopifyAdminAccessToken,
} from "./admin-auth-shared";

const SHOPIFY_ADMIN_REQUEST_TIMEOUT_MS = 10_000;

let cachedAccessToken: ShopifyAdminAccessToken | null = null;
let accessTokenRequest: Promise<ShopifyAdminAccessToken> | null = null;

async function requestAccessToken(): Promise<ShopifyAdminAccessToken> {
  const shopDomain = getShopifyStoreDomain();
  if (!shopDomain.endsWith(".myshopify.com")) {
    throw new Error("Shopify Admin authentication requires a myshopify.com store domain");
  }

  let response: Response;
  try {
    response = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: getShopifyAdminClientId(),
        client_secret: getShopifyAdminClientSecret(),
        grant_type: "client_credentials",
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(SHOPIFY_ADMIN_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Shopify Admin authentication failed or timed out");
  }
  if (!response.ok) throw new Error(`Shopify Admin authentication failed (${response.status})`);

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Shopify Admin authentication returned invalid JSON");
  }
  try {
    return parseShopifyAdminAccessToken(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "shopify_admin_read_orders_scope_missing") {
      throw new Error("Shopify Admin token is missing the read_orders scope");
    }
    throw new Error("Shopify Admin authentication returned an invalid response");
  }
}

async function getAccessToken(): Promise<ShopifyAdminAccessToken> {
  if (shopifyAdminTokenIsUsable(cachedAccessToken)) return cachedAccessToken;
  if (accessTokenRequest) return accessTokenRequest;

  accessTokenRequest = requestAccessToken()
    .then((token) => {
      cachedAccessToken = token;
      return token;
    })
    .finally(() => {
      accessTokenRequest = null;
    });
  return accessTokenRequest;
}

function invalidateAccessToken(accessToken: string): void {
  if (cachedAccessToken?.accessToken === accessToken) cachedAccessToken = null;
}

interface ShopifyAdminGraphqlResponse<T> {
  data?: T;
  errors?: unknown[];
}

async function executeAdminGraphql<T>(
  query: string,
  variables: Record<string, unknown>,
  retryUnauthorized: boolean,
): Promise<T> {
  const token = await getAccessToken();
  const shopDomain = getShopifyStoreDomain();
  const version = getShopifyAdminApiVersion();
  let response: Response;
  try {
    response = await fetch(`https://${shopDomain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token.accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(SHOPIFY_ADMIN_REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new Error("Shopify Admin request failed or timed out");
  }

  if (response.status === 401 && retryUnauthorized) {
    invalidateAccessToken(token.accessToken);
    return executeAdminGraphql<T>(query, variables, false);
  }
  if (!response.ok) throw new Error(`Shopify Admin HTTP error (${response.status})`);

  let result: ShopifyAdminGraphqlResponse<T>;
  try {
    result = await response.json() as ShopifyAdminGraphqlResponse<T>;
  } catch {
    throw new Error("Shopify Admin returned invalid JSON");
  }
  if (result.errors?.length) throw new Error("Shopify Admin GraphQL request failed");
  if (!result.data) throw new Error("Shopify Admin returned no data");
  return result.data;
}

export function shopifyAdminGraphqlRequest<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  return executeAdminGraphql<T>(query, variables, true);
}
