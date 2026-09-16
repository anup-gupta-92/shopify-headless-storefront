import { type NextRequest, NextResponse } from "next/server";
import { getCatalogPage, parseCatalogParams } from "@/lib/shopify/catalog";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
  if (!cursor || cursor.length > 2_000) return errorResponse("The next product page could not be loaded.", 400);

  try {
    const filters = parseCatalogParams(request.nextUrl.searchParams);
    const page = await getCatalogPage(filters, cursor);
    return NextResponse.json({ page }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("More products are temporarily unavailable. Please try again.", 503);
  }
}
