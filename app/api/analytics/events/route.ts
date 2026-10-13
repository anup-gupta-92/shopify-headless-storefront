import { readConsentCookie } from "@/lib/consent";
import { analyticsDatabase, countryCodeFromRequest } from "@/lib/analytics/server";
import { ANALYTICS_MAX_REQUEST_BYTES } from "@/lib/analytics/first-party-shared";
import { validateAnalyticsBatch } from "@/lib/analytics/validation";

export const runtime = "edge";

function noStore(status = 204) {
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return noStore(403);
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > ANALYTICS_MAX_REQUEST_BYTES) return noStore(413);

  const cookieHeader = request.headers.get("cookie") ?? "";
  if (/(?:^|;\s*)apex_analytics_exclude=true(?:;|$)/.test(cookieHeader)) return noStore();
  const consent = readConsentCookie(cookieHeader);
  if (!consent?.analytics) return noStore(403);

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return noStore(400);
  }
  if (!raw || new TextEncoder().encode(raw).byteLength > ANALYTICS_MAX_REQUEST_BYTES) return noStore(413);

  try {
    const payload = validateAnalyticsBatch(JSON.parse(raw));
    const now = Math.floor(Date.now() / 1000);
    const session = payload.session;
    const db = await analyticsDatabase();
    const statements: D1PreparedStatement[] = [db.prepare(`
      INSERT INTO analytics_sessions (
        session_id, visitor_id, started_at, last_seen_at, country_code,
        browser_name, browser_version_major, os_name, os_version_major, device_type, language,
        landing_path, referrer_host, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
        acquisition_channel, has_click_id, click_id_type, is_pwa,
        initial_theme, current_theme, theme_source, analytics_consent_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'granted', ?, ?)
      ON CONFLICT(session_id) DO UPDATE SET
        last_seen_at = MAX(analytics_sessions.last_seen_at, excluded.last_seen_at),
        current_theme = COALESCE(excluded.current_theme, analytics_sessions.current_theme),
        analytics_consent_status = 'granted',
        updated_at = excluded.updated_at
    `).bind(
      session.sessionId, session.visitorId, session.startedAt, session.lastSeenAt,
      countryCodeFromRequest(request), session.browserName ?? null, session.browserVersionMajor ?? null,
      session.osName ?? null, session.osVersionMajor ?? null, session.deviceType ?? null, session.language ?? null,
      session.landingPath ?? null, session.referrerHost ?? null, session.utmSource ?? null, session.utmMedium ?? null,
      session.utmCampaign ?? null, session.utmContent ?? null, session.utmTerm ?? null,
      session.acquisitionChannel ?? "unknown", session.hasClickId, session.clickIdType ?? null, session.isPwa,
      session.initialTheme ?? null, session.currentTheme ?? null, session.themeSource ?? null, now, now,
    )];

    for (const event of payload.events) {
      statements.push(db.prepare(`
        INSERT OR IGNORE INTO analytics_events (
          event_id, session_id, event_name, occurred_at, received_at, page_path, page_type, source_surface,
          product_id, product_handle, variant_id, sku, quantity, value_minor, currency, properties_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        event.eventId, session.sessionId, event.eventName, event.occurredAt, now,
        event.pagePath ?? null, event.pageType ?? null, event.sourceSurface ?? null,
        event.productId ?? null, event.productHandle ?? null, event.variantId ?? null, event.sku ?? null,
        event.quantity ?? null, event.valueMinor ?? null, event.currency ?? null,
        event.properties ? JSON.stringify(event.properties) : null,
      ));
    }
    await db.batch(statements);
    return noStore();
  } catch (error) {
    const validationError = error instanceof SyntaxError || (error instanceof Error && /^(invalid_|unsupported_|properties_|search_)/.test(error.message));
    return noStore(validationError ? 400 : 503);
  }
}
