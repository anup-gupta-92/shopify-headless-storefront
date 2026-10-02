import { getShopifyStoreDomain } from "@/lib/shopify/config";
import { proxyShopifyAgenticRequest, shopifyMcpUrl } from "@/lib/shopify/agentic-proxy";

async function relay(request: Request) {
  try {
    return await proxyShopifyAgenticRequest(
      request,
      shopifyMcpUrl(getShopifyStoreDomain(), request.url),
      "mcp",
    );
  } catch {
    return Response.json(
      {
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message: "Shopify UCP is temporarily unavailable." },
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export function POST(request: Request) {
  return relay(request);
}

export function OPTIONS(request: Request) {
  return relay(request);
}
