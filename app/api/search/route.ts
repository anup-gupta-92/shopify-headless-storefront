import { type NextRequest, NextResponse } from "next/server";
import { getProductSearchPage, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@/lib/shopify/search";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  const cursor = request.nextUrl.searchParams.get("cursor")?.trim();
  if (rawQuery.length > SEARCH_QUERY_MAX_LENGTH || !cursor || cursor.length > 2_000) {
    return errorResponse("The next search page could not be loaded.", 400);
  }

  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) return errorResponse("Enter at least two characters to search.", 400);

  try {
    const page = await getProductSearchPage(query, cursor);
    return NextResponse.json({ page }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return errorResponse("More search results are temporarily unavailable. Please try again.", 503);
  }
}
