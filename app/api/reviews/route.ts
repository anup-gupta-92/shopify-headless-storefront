import { getProductReviewPage } from "@/lib/judgeme/client";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId") ?? "";
  const page = Number(searchParams.get("page"));
  if (!/^gid:\/\/shopify\/Product\/[1-9]\d*$/.test(productId) || !Number.isInteger(page) || page < 2 || page > 100) {
    return Response.json({ error: "Invalid review page" }, { status: 400 });
  }
  const result = await getProductReviewPage(productId, page);
  return result
    ? Response.json(result, { headers: { "Cache-Control": "private, no-store" } })
    : Response.json({ error: "Reviews are temporarily unavailable" }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
}
