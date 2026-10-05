const SHOPIFY_CHECKOUT_RECOVERY_PREFIX = "/_t/c/v3/";

function rawPathAndQuery(requestUrl: string): string {
  const schemeEnd = requestUrl.indexOf("://");
  const pathStart = schemeEnd >= 0 ? requestUrl.indexOf("/", schemeEnd + 3) : -1;
  return pathStart >= 0 ? requestUrl.slice(pathStart) : "/";
}

export function shopifyCheckoutRecoveryUrl(storeDomain: string, requestUrl: string): string {
  const pathAndQuery = rawPathAndQuery(requestUrl);
  const queryStart = pathAndQuery.indexOf("?");
  const pathname = queryStart >= 0 ? pathAndQuery.slice(0, queryStart) : pathAndQuery;

  if (!pathname.startsWith(SHOPIFY_CHECKOUT_RECOVERY_PREFIX)
    || pathname.length === SHOPIFY_CHECKOUT_RECOVERY_PREFIX.length) {
    throw new Error("Invalid Shopify checkout recovery path");
  }

  return `https://${storeDomain}${pathAndQuery}`;
}

export function checkoutRecoveryRedirect(storeDomain: string, requestUrl: string): Response {
  return new Response(null, {
    status: 307,
    headers: {
      "Cache-Control": "private, no-store",
      Location: shopifyCheckoutRecoveryUrl(storeDomain, requestUrl),
    },
  });
}
