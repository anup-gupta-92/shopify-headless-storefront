import { analyticsDatabase } from "@/lib/analytics/server";
import { ANALYTICS_MAX_REQUEST_BYTES } from "@/lib/analytics/first-party-shared";
import { validateConsentAggregate } from "@/lib/analytics/validation";

export const runtime = "edge";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048 || contentLength > ANALYTICS_MAX_REQUEST_BYTES) return new Response(null, { status: 413 });
  try {
    const raw = await request.text();
    if (!raw || new TextEncoder().encode(raw).byteLength > 2048) return new Response(null, { status: 413 });
    const input = validateConsentAggregate(JSON.parse(raw));
    const now = Math.floor(Date.now() / 1000);
    const bucketDate = new Date(now * 1000).toISOString().slice(0, 10);
    const db = await analyticsDatabase();
    await db.prepare(`
      INSERT INTO analytics_consent_daily (
        bucket_date, decision, analytics_allowed, marketing_allowed, action, count, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(bucket_date, decision, analytics_allowed, marketing_allowed, action)
      DO UPDATE SET count = analytics_consent_daily.count + 1, updated_at = excluded.updated_at
    `).bind(
      bucketDate, input.decision, input.analyticsAllowed, input.marketingAllowed, input.action, now,
    ).run();
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const validationError = error instanceof SyntaxError || (error instanceof Error && error.message.startsWith("invalid_"));
    return new Response(null, { status: validationError ? 400 : 503, headers: { "Cache-Control": "no-store" } });
  }
}
