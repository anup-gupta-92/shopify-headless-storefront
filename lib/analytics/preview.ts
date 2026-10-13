"use client";

import { useSyncExternalStore } from "react";

export const ANALYTICS_PREVIEW_PARAMETER = "analytics_preview";
export const ANALYTICS_PREVIEW_STORAGE_KEY = "apex:analytics:preview";
export const ANALYTICS_PREVIEW_CHANGE_EVENT = "apex:analytics-preview-change";

function previewRequestedByUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URL(window.location.href).searchParams.get(ANALYTICS_PREVIEW_PARAMETER) === "1";
}

function previewStoredForTab(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(ANALYTICS_PREVIEW_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function isAnalyticsPreviewActive(): boolean {
  return previewRequestedByUrl() || previewStoredForTab();
}

function subscribeAnalyticsPreview(onStoreChange: () => void): () => void {
  window.addEventListener(ANALYTICS_PREVIEW_CHANGE_EVENT, onStoreChange);
  return () => window.removeEventListener(ANALYTICS_PREVIEW_CHANGE_EVENT, onStoreChange);
}

export function useAnalyticsPreviewActive(): boolean {
  return useSyncExternalStore(subscribeAnalyticsPreview, isAnalyticsPreviewActive, () => false);
}

export function activateAnalyticsPreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(ANALYTICS_PREVIEW_STORAGE_KEY, "true");
  } catch {
    // The URL parameter still suppresses analytics when storage is unavailable.
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_PREVIEW_CHANGE_EVENT, { detail: true }));
}

export function deactivateAnalyticsPreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(ANALYTICS_PREVIEW_STORAGE_KEY);
  } catch {
    // Storage restrictions are a supported no-op.
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_PREVIEW_CHANGE_EVENT, { detail: false }));
}
