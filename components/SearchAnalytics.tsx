"use client";

import { useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import { trackSearch } from "@/lib/analytics/events";
import { consumeCommittedSearchSource } from "@/lib/analytics/first-party";

export default function SearchAnalytics({ query, resultCount }: { query: string; resultCount: number }) {
  const { hasConsent } = useCookieConsent();
  const analyticsEnabled = hasConsent("analytics");
  const lastQueryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!analyticsEnabled || query.length < 2 || lastQueryRef.current === query) return;
    lastQueryRef.current = query;
    trackSearch(query, resultCount, consumeCommittedSearchSource());
  }, [analyticsEnabled, query, resultCount]);

  return null;
}
