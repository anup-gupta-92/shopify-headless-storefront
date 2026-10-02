import { getShopifyStoreDomain } from "@/lib/shopify/config";
import { proxyShopifyAgenticRequest, shopifyUcpDiscoveryUrl } from "@/lib/shopify/agentic-proxy";

export async function GET(request: Request) {
  try {
    return await proxyShopifyAgenticRequest(
      request,
      shopifyUcpDiscoveryUrl(getShopifyStoreDomain()),
      "discovery",
    );
  } catch {
    return Response.json(
      { error: "Shopify UCP discovery is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
