import { type NextRequest, NextResponse } from "next/server";
import { getPredictiveSearch, normalizeSearchQuery, SEARCH_QUERY_MAX_LENGTH } from "@/lib/shopify/search";

const RESPONSE_CACHE = "public, s-maxage=60, stale-while-revalidate=60";

export async function GET(request: NextRequest) {
  const rawQuery = request.nextUrl.searchParams.get("q") ?? "";
  if (rawQuery.length > SEARCH_QUERY_MAX_LENGTH) {
    return NextResponse.json(
      { error: "Search terms are too long." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const query = normalizeSearchQuery(rawQuery);
  if (query.length < 2) {
    return NextResponse.json(
      { query, products: [], categories: [], brands: [] },
      { headers: { "Cache-Control": RESPONSE_CACHE } },
    );
  }

  try {
    const result = await getPredictiveSearch(query);
    return NextResponse.json(result, { headers: { "Cache-Control": RESPONSE_CACHE } });
  } catch {
    return NextResponse.json(
      { error: "Search suggestions are temporarily unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
