"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { clearQueuedAnalyticsEvents } from "@/lib/analytics/first-party";
import { disableGoogleAnalytics } from "@/lib/analytics/google";
import {
  activateAnalyticsPreview,
  ANALYTICS_PREVIEW_PARAMETER,
  deactivateAnalyticsPreview,
  isAnalyticsPreviewActive,
  useAnalyticsPreviewActive,
} from "@/lib/analytics/preview";

export default function AnalyticsPreviewMode() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previewRequested = searchParams.get(ANALYTICS_PREVIEW_PARAMETER) === "1";
  const active = useAnalyticsPreviewActive();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }
    if (previewRequested) activateAnalyticsPreview();
    const nextActive = isAnalyticsPreviewActive();
    if (nextActive) {
      clearQueuedAnalyticsEvents();
      disableGoogleAnalytics();
    }
  }, [pathname, previewRequested]);

  if (!active || pathname.startsWith("/admin")) return null;

  function exitPreview() {
    const url = new URL(window.location.href);
    url.searchParams.delete(ANALYTICS_PREVIEW_PARAMETER);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    deactivateAnalyticsPreview();
  }

  return (
    <aside
      aria-label="Analytics preview status"
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] left-1/2 z-30 flex w-[min(92vw,28rem)] -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-primary/30 bg-surface px-4 py-3 text-sm text-foreground shadow-xl"
    >
      <span className="min-w-0">Analytics preview mode — tracking disabled</span>
      <button
        type="button"
        onClick={exitPreview}
        className="shrink-0 rounded-lg border border-border bg-background px-3 py-2 font-semibold transition hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Exit preview
      </button>
    </aside>
  );
}
