import "server-only";
import { getShopifyStoreDomain } from "../config";

const DISCOVERY_REVALIDATE_SECONDS = 3600;

export interface OpenIdConfiguration {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint: string;
  jwks_uri: string;
}

export interface CustomerAccountConfiguration {
  graphql_api: string;
}

function requireHttpsUrl(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Shopify discovery is missing ${field}`);
  const url = new URL(value);
  if (url.protocol !== "https:") throw new Error(`Shopify discovery returned an invalid ${field}`);
  return url.toString();
}

async function discover(path: string): Promise<Record<string, unknown>> {
  const domain = getShopifyStoreDomain();
  let response: Response;
  try {
    response = await fetch(`https://${domain}${path}`, {
      headers: { Accept: "application/json" },
      next: {
        revalidate: DISCOVERY_REVALIDATE_SECONDS,
        tags: ["shopify-customer-account-discovery"],
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error("Shopify Customer Account discovery is unavailable");
  }

  if (!response.ok) throw new Error("Shopify Customer Account discovery failed");
  const body: unknown = await response.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error("Shopify Customer Account discovery returned invalid data");
  }
  return body as Record<string, unknown>;
}

export async function getOpenIdConfiguration(): Promise<OpenIdConfiguration> {
  const body = await discover("/.well-known/openid-configuration");
  return {
    issuer: requireHttpsUrl(body.issuer, "issuer").replace(/\/$/, ""),
    authorization_endpoint: requireHttpsUrl(body.authorization_endpoint, "authorization_endpoint"),
    token_endpoint: requireHttpsUrl(body.token_endpoint, "token_endpoint"),
    end_session_endpoint: requireHttpsUrl(body.end_session_endpoint, "end_session_endpoint"),
    jwks_uri: requireHttpsUrl(body.jwks_uri, "jwks_uri"),
  };
}

export async function getCustomerAccountConfiguration(): Promise<CustomerAccountConfiguration> {
  const body = await discover("/.well-known/customer-account-api");
  return { graphql_api: requireHttpsUrl(body.graphql_api, "graphql_api") };
}
