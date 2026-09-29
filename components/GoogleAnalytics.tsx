"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import { trackPageView } from "@/lib/analytics/events";
import {
  disableGoogleAnalytics,
  getGoogleMeasurementId,
  initializeGoogleAnalytics,
} from "@/lib/analytics/google";
import {
  CONSENT_CHANGE_EVENT,
  type ConsentPreferences,
} from "@/lib/consent";

function PageViewTracker({ enabled }: { enabled: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPageRef = useRef<string | null>(null);
  const search = searchParams.toString();
  const path = `${pathname}${search ? `?${search}` : ""}`;

  useEffect(() => {
    if (!enabled) {
      lastPageRef.current = null;
      return;
    }
    if (lastPageRef.current === path) return;
    lastPageRef.current = path;
    trackPageView(path);
  }, [enabled, path]);

  return null;
}

export default function GoogleAnalytics() {
  const { ready, hasConsent } = useCookieConsent();
  const measurementId = getGoogleMeasurementId();
  const enabled = Boolean(ready && measurementId && hasConsent("analytics"));

  useEffect(() => {
    if (enabled) initializeGoogleAnalytics();
    else disableGoogleAnalytics();
  }, [enabled]);

  useEffect(() => {
    function handleConsentChange(event: Event) {
      const preferences = (event as CustomEvent<ConsentPreferences>).detail;
      if (preferences?.analytics) initializeGoogleAnalytics();
      else disableGoogleAnalytics();
    }
    window.addEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
    return () => window.removeEventListener(CONSENT_CHANGE_EVENT, handleConsentChange);
  }, []);

  if (!measurementId) return null;

  return (
    <>
      {enabled && (
        <Script
          id="apex-google-analytics"
          src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`}
          strategy="afterInteractive"
          onReady={() => { initializeGoogleAnalytics(); }}
        />
      )}
      <Suspense fallback={null}>
        <PageViewTracker enabled={enabled} />
      </Suspense>
    </>
  );
}
