"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import { pageTypeForPath } from "@/lib/analytics/first-party-shared";
import { trackAnalyticsEvent } from "@/lib/analytics/first-party";
import { isAnalyticsPreviewActive, useAnalyticsPreviewActive } from "@/lib/analytics/preview";

export default function FirstPartyAnalytics() {
  const pathname = usePathname();
  const { ready, hasConsent } = useCookieConsent();
  const lastPath = useRef<string | null>(null);
  const previewActive = useAnalyticsPreviewActive();
  const enabled = ready && hasConsent("analytics") && !previewActive && !isAnalyticsPreviewActive();

  useEffect(() => {
    if (!enabled) { lastPath.current = null; return; }
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/") || lastPath.current === pathname) return;
    lastPath.current = pathname;
    const pageType = pageTypeForPath(pathname);
    trackAnalyticsEvent({ eventName: "page_view", pagePath: pathname, pageType, sourceSurface: "site" });
    if (pageType === "shop" || pageType === "collection") {
      trackAnalyticsEvent({ eventName: "catalog_view", pagePath: pathname, pageType, sourceSurface: pageType === "shop" ? "shop" : "collection" });
    }
  }, [enabled, pathname]);

  return null;
}
