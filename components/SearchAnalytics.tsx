"use client";

import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import { trackSearch } from "@/lib/analytics/events";

export default function SearchAnalytics({ query }: { query: string }) {
  const { hasConsent } = useCookieConsent();
  const analyticsEnabled = hasConsent("analytics");
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled || query.length < 2 || lastQueryRef.current === query) return;
    lastQueryRef.current = query;
    trackSearch(query);
  }, [analyticsEnabled, query]);

  return null;
}
