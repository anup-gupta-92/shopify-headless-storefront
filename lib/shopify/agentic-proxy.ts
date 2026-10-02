export type ShopifyAgenticProxyKind = "discovery" | "mcp";

const DISCOVERY_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "if-modified-since",
  "if-none-match",
  "user-agent",
]);

const MCP_REQUEST_HEADERS = new Set([
  "accept",
  "accept-language",
  "access-control-request-headers",
  "access-control-request-method",
  "access-control-request-private-network",
  "authorization",
  "content-digest",
  "content-type",
  "date",
  "digest",
  "idempotency-key",
  "last-event-id",
  "mcp-protocol-version",
  "mcp-session-id",
  "origin",
  "signature",
  "signature-input",
  "user-agent",
  "x-sdk-variant",
  "x-sdk-variant-source",
  "x-sdk-version",
  "x-shopify-storefront-access-token",
  "x-shopify-ucp-mcp-api-version",
  "x-shopify-unique-token",
  "x-shopify-visit-token",
]);

const RESPONSE_HEADERS = new Set([
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-allow-origin",
  "access-control-allow-private-network",
  "access-control-expose-headers",
  "access-control-max-age",
  "cache-control",
  "cdn-cache-control",
  "content-digest",
  "content-language",
  "content-type",
  "etag",
  "last-modified",
  "link",
  "location",
  "mcp-protocol-version",
  "mcp-session-id",
  "retry-after",
  "signature",
  "signature-input",
  "vary",
  "www-authenticate",
  "x-request-id",
  "x-shopify-ucp-mcp-api-version",
]);

export function shopifyUcpDiscoveryUrl(storeDomain: string): URL {
  return new URL(`https://${storeDomain}/.well-known/ucp`);
}

export function shopifyMcpUrl(storeDomain: string, requestUrl: string): URL {
  const upstream = new URL(`https://${storeDomain}/api/ucp/mcp`);
  upstream.search = new URL(requestUrl).search;
  return upstream;
}

export function shopifyAgenticRequestHeaders(request: Request, kind: ShopifyAgenticProxyKind): Headers {
  const allowed = kind === "discovery" ? DISCOVERY_REQUEST_HEADERS : MCP_REQUEST_HEADERS;
  const headers = new Headers();
  for (const [name, value] of request.headers) {
    if (allowed.has(name.toLowerCase())) headers.set(name, value);
  }
  return headers;
}

export function shopifyAgenticResponseHeaders(upstream: Response): Headers {
  const headers = new Headers();
  for (const [name, value] of upstream.headers) {
    const normalized = name.toLowerCase();
    if (
      RESPONSE_HEADERS.has(normalized)
      || normalized.startsWith("ratelimit-")
      || normalized.startsWith("x-ratelimit-")
    ) {
      headers.set(name, value);
    }
  }
  return headers;
}

export async function proxyShopifyAgenticRequest(
  request: Request,
  upstreamUrl: URL,
  kind: ShopifyAgenticProxyKind,
): Promise<Response> {
  const hasBody = request.method === "POST";
  const body = hasBody ? await request.arrayBuffer() : undefined;
  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: shopifyAgenticRequestHeaders(request, kind),
    ...(body ? { body } : {}),
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: shopifyAgenticResponseHeaders(upstream),
  });
}
