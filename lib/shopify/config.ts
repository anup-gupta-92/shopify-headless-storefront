import "server-only";

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required Shopify environment variable: ${name}`);
  return value;
}

export function getShopifyStoreDomain(): string {
  const domain = requiredEnv("SHOPIFY_STORE_DOMAIN")
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+$/.test(domain)) {
    throw new Error("Invalid SHOPIFY_STORE_DOMAIN: expected a hostname");
  }

  return domain;
}

export function getShopifyStorefrontPrivateToken(): string {
  return requiredEnv("SHOPIFY_STOREFRONT_PRIVATE_TOKEN");
}

export function getShopifyStorefrontApiVersion(): string {
  const version = requiredEnv("SHOPIFY_STOREFRONT_API_VERSION");
  if (!/^\d{4}-\d{2}$/.test(version)) {
    throw new Error("Invalid SHOPIFY_STOREFRONT_API_VERSION: expected YYYY-MM");
  }
  return version;
}

export function getCustomerAccountClientId(): string {
  return requiredEnv("SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID");
}
