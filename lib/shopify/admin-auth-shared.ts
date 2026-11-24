export const SHOPIFY_ADMIN_TOKEN_REFRESH_SKEW_SECONDS = 60;

export interface ShopifyAdminAccessToken {
  accessToken: string;
  scopes: string[];
  expiresAtMs: number;
  refreshAtMs: number;
}

function stringField(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : null;
}

export function parseShopifyAdminAccessToken(
  value: unknown,
  nowMs = Date.now(),
): ShopifyAdminAccessToken {
  if (!value || typeof value !== "object") throw new Error("invalid_shopify_admin_token_response");
  const response = value as Record<string, unknown>;
  const accessToken = stringField(response.access_token, 2_048);
  const scope = stringField(response.scope, 4_096);
  const expiresIn = response.expires_in;
  if (
    !accessToken
    || !scope
    || typeof expiresIn !== "number"
    || !Number.isSafeInteger(expiresIn)
    || expiresIn <= 0
  ) {
    throw new Error("invalid_shopify_admin_token_response");
  }

  const scopes = scope.split(/[\s,]+/).filter(Boolean);
  if (!scopes.includes("read_orders")) throw new Error("shopify_admin_read_orders_scope_missing");

  const expiresInSeconds = expiresIn;
  const refreshSkewSeconds = Math.min(
    SHOPIFY_ADMIN_TOKEN_REFRESH_SKEW_SECONDS,
    Math.max(1, Math.floor(expiresInSeconds / 10)),
  );
  return {
    accessToken,
    scopes,
    expiresAtMs: nowMs + expiresInSeconds * 1_000,
    refreshAtMs: nowMs + Math.max(0, expiresInSeconds - refreshSkewSeconds) * 1_000,
  };
}

export function shopifyAdminTokenIsUsable(
  token: ShopifyAdminAccessToken | null,
  nowMs = Date.now(),
): token is ShopifyAdminAccessToken {
  return Boolean(token && nowMs < token.refreshAtMs);
}
