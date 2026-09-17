import { type NextRequest, NextResponse } from "next/server";
import { parseCatalogParams } from "@/lib/shopify/catalog";
import { getCollectionPage } from "@/lib/shopify/collections";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> },
) {
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
  if (!cursor || cursor.length > 2_000) return errorResponse("The next product page could not be loaded.", 400);

  try {
    const { handle } = await params;
    const parsed = parseCatalogParams(request.nextUrl.searchParams);
    const filters = { ...parsed, productTypes: [] };
    const page = await getCollectionPage(handle, filters, cursor);
    if (!page) return errorResponse("Collection not found.", 404);
    return NextResponse.json({ page }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("More products are temporarily unavailable. Please try again.", 503);
  }
}
