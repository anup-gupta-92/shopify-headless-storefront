import type { NextRequest } from "next/server";
import { getShopifyStoreDomain } from "@/lib/shopify/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export function GET(request: NextRequest) {
  try {
    const destinationOrigin = `https://${getShopifyStoreDomain()}`;
    const schemeEnd = request.url.indexOf("://");
    const pathStart = schemeEnd >= 0 ? request.url.indexOf("/", schemeEnd + 3) : -1;
    const pathAndQuery = pathStart >= 0 ? request.url.slice(pathStart) : "/";

    return new Response(null, {
      status: 307,
      headers: {
        ...noStoreHeaders,
        Location: `${destinationOrigin}${pathAndQuery}`,
      },
    });
  } catch {
    return Response.json(
      { error: "Order status is temporarily unavailable." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
