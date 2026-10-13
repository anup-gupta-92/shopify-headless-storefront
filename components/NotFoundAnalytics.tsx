"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/first-party";

export default function NotFoundAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    trackAnalyticsEvent({
      eventName: "404_view",
      pagePath: pathname,
      pageType: "other",
      sourceSurface: "site",
      properties: { requested_path: pathname },
    }, { dedupeKey: `404-view:${pathname}` });
  }, [pathname]);

  return null;
}
