"use client";

import { getStoredConsent, hasConsent } from "@/lib/consent";

type GoogleTag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() ?? "";
let configured = false;

function disableKey() {
  return `ga-disable-${measurementId}`;
}

function setCollectionDisabled(disabled: boolean) {
  if (typeof window === "undefined" || !measurementId) return;
  (window as unknown as Record<string, unknown>)[disableKey()] = disabled;
}

function analyticsConsentGranted() {
  return hasConsent(getStoredConsent(), "analytics");
}

export function getGoogleMeasurementId() {
  return measurementId || null;
}

export function initializeGoogleAnalytics(): boolean {
  if (typeof window === "undefined" || !measurementId || !analyticsConsentGranted()) return false;

  setCollectionDisabled(false);
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = window.gtag ?? function gtag() {
    // Google gtag.js expects each queued command to be the function's Arguments object.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments);
  };

  if (!configured) {
    window.gtag("js", new Date());
    window.gtag("config", measurementId, { send_page_view: false });
    configured = true;
  }

  return true;
}

export function disableGoogleAnalytics() {
  setCollectionDisabled(true);
}

export function sendGoogleEvent(name: string, parameters: Record<string, unknown>) {
  if (!analyticsConsentGranted() || !initializeGoogleAnalytics()) return;
  window.gtag?.("event", name, parameters);
}
