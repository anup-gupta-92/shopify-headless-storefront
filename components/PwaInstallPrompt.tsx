"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/CartProvider";
import { useCookieConsent } from "@/components/CookieConsentProvider";
import {
  trackPwaInstallClicked,
  trackPwaInstallDismissed,
  trackPwaInstalled,
  trackPwaLaunchedStandalone,
  trackPwaPromptShown,
} from "@/lib/analytics/events";
import {
  hasActivePwaDismissal,
  isInstallPromptSuppressedPath,
  isLikelyAppleMobile,
  isPwaStandalone,
  PWA_DISMISSAL_STORAGE_KEY,
  PWA_ENGAGEMENT_MS,
  PWA_LAST_PATH_STORAGE_KEY,
  PWA_VISIT_COUNT_STORAGE_KEY,
  shouldShowPwaInstallPromotion,
} from "@/lib/pwa";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface AppleNavigator extends Navigator {
  standalone?: boolean;
}

const focusClass = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const sessionPromptShownKey = "apex:pwa-prompt-shown";
const sessionStandaloneLaunchKey = "apex:pwa-standalone-launch-tracked";

function storageGet(storage: Storage, key: string) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(storage: Storage, key: string, value: string) {
  try {
    storage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private/restricted browsing contexts.
  }
}

function currentStandaloneState(mediaQuery: MediaQueryList) {
  return isPwaStandalone({
    displayModeStandalone: mediaQuery.matches,
    appleStandalone: (window.navigator as AppleNavigator).standalone,
  });
}

export default function PwaInstallPrompt() {
  const pathname = usePathname();
  const { drawerOpen } = useCart();
  const { consent, ready, preferencesOpen, hasConsent } = useCookieConsent();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [standalone, setStandalone] = useState(false);
  const [appleMobile, setAppleMobile] = useState(false);
  const [dismissalChecked, setDismissalChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const [visitCount, setVisitCount] = useState(0);
  const [timeThresholdMet, setTimeThresholdMet] = useState(false);
  const [bulkSummaryVisible, setBulkSummaryVisible] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const shownTracked = useRef(false);

  useEffect(() => {
    const storedDismissal = storageGet(window.localStorage, PWA_DISMISSAL_STORAGE_KEY);
    const environment = {
      userAgent: window.navigator.userAgent,
      platform: window.navigator.platform,
      maxTouchPoints: window.navigator.maxTouchPoints,
    };
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateStandalone = () => setStandalone(currentStandaloneState(displayMode));
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDismissed(hasActivePwaDismissal(storedDismissal));
      setDismissalChecked(true);
      setAppleMobile(isLikelyAppleMobile(environment));
      updateStandalone();
    });
    displayMode.addEventListener?.("change", updateStandalone);
    return () => {
      active = false;
      displayMode.removeEventListener?.("change", updateStandalone);
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setStandalone(true);
      trackPwaInstalled();
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    const markInteraction = (event: Event) => {
      if (!event.isTrusted) return;
      setInteracted(true);
      window.removeEventListener("pointerdown", markInteraction, true);
      window.removeEventListener("keydown", markInteraction, true);
      window.removeEventListener("touchstart", markInteraction, true);
    };
    window.addEventListener("pointerdown", markInteraction, true);
    window.addEventListener("keydown", markInteraction, true);
    window.addEventListener("touchstart", markInteraction, true);
    return () => {
      window.removeEventListener("pointerdown", markInteraction, true);
      window.removeEventListener("keydown", markInteraction, true);
      window.removeEventListener("touchstart", markInteraction, true);
    };
  }, []);

  useEffect(() => {
    const lastPath = storageGet(window.sessionStorage, PWA_LAST_PATH_STORAGE_KEY);
    const storedCount = Number(storageGet(window.sessionStorage, PWA_VISIT_COUNT_STORAGE_KEY));
    const currentCount = Number.isSafeInteger(storedCount) && storedCount > 0 ? storedCount : 0;
    const nextCount = lastPath === pathname ? Math.max(1, currentCount) : currentCount + 1;
    storageSet(window.sessionStorage, PWA_LAST_PATH_STORAGE_KEY, pathname);
    storageSet(window.sessionStorage, PWA_VISIT_COUNT_STORAGE_KEY, String(nextCount));
    let active = true;
    queueMicrotask(() => {
      if (active) setVisitCount(nextCount);
    });
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => {
    let visibleElapsed = 0;
    let visibleSince: number | null = null;
    let timerId: number | null = null;

    const stopTimer = () => {
      if (visibleSince !== null) {
        visibleElapsed += performance.now() - visibleSince;
        visibleSince = null;
      }
      if (timerId !== null) {
        window.clearTimeout(timerId);
        timerId = null;
      }
    };
    const startTimer = () => {
      if (document.visibilityState !== "visible" || visibleSince !== null) return;
      visibleSince = performance.now();
      timerId = window.setTimeout(() => setTimeThresholdMet(true), Math.max(0, PWA_ENGAGEMENT_MS - visibleElapsed));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") startTimer();
      else stopTimer();
    };

    startTimer();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopTimer();
    };
  }, []);

  useEffect(() => {
    const update = () => setBulkSummaryVisible(document.body.classList.contains("bulk-order-summary-visible"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!standalone || !ready || !hasConsent("analytics")) return;
    if (storageGet(window.sessionStorage, sessionStandaloneLaunchKey)) return;
    storageSet(window.sessionStorage, sessionStandaloneLaunchKey, "1");
    trackPwaLaunchedStandalone();
  }, [hasConsent, ready, standalone]);

  const platform = deferredPrompt ? "chromium" : appleMobile ? "ios" : null;
  const blockedByUi = consent === null
    || preferencesOpen
    || drawerOpen
    || bulkSummaryVisible
    || isInstallPromptSuppressedPath(pathname);
  const visible = shouldShowPwaInstallPromotion({
    dismissalChecked,
    dismissed,
    standalone,
    blockedByUi,
    installPathAvailable: platform !== null,
    interacted,
    visitCount,
    timeThresholdMet,
  });

  useEffect(() => {
    if (!visible || !platform || shownTracked.current) return;
    shownTracked.current = true;
    if (storageGet(window.sessionStorage, sessionPromptShownKey)) return;
    storageSet(window.sessionStorage, sessionPromptShownKey, "1");
    trackPwaPromptShown(platform);
  }, [platform, visible]);

  const dismiss = useCallback((source: "not_now" | "native_prompt") => {
    storageSet(window.localStorage, PWA_DISMISSAL_STORAGE_KEY, String(Date.now()));
    setDismissed(true);
    setShowIosInstructions(false);
    trackPwaInstallDismissed(source);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    const promptEvent = deferredPrompt;
    setDeferredPrompt(null);
    trackPwaInstallClicked("chromium");
    try {
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice.outcome === "dismissed") dismiss("native_prompt");
    } catch {
      // Native install UI is browser-owned; storefront behavior remains unchanged if it fails.
    }
  }, [deferredPrompt, dismiss]);

  const cardClasses = useMemo(() => [
    "fixed inset-x-3 z-[30] rounded-2xl border border-border bg-surface p-4 text-foreground shadow-2xl",
    "bottom-[calc(0.75rem+env(safe-area-inset-bottom))]",
    "sm:inset-x-auto sm:right-5 sm:w-full sm:max-w-sm sm:bottom-5",
  ].join(" "), []);

  if (!visible || !platform) return null;

  if (platform === "ios" && showIosInstructions) {
    return (
      <aside className={cardClasses} aria-labelledby="pwa-ios-instructions-title">
        <h2 id="pwa-ios-instructions-title" className="text-base font-bold">Add Apex to your Home Screen</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm leading-6 text-muted">
          <li>Tap the Share button in your browser.</li>
          <li>Choose <strong className="text-foreground">Add to Home Screen</strong>.</li>
          <li>Confirm <strong className="text-foreground">Add</strong>.</li>
        </ol>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => dismiss("not_now")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-muted hover:text-foreground ${focusClass}`}>Not now</button>
          <button type="button" onClick={() => setShowIosInstructions(false)} className={`min-h-11 rounded-lg border border-primary px-4 text-sm font-semibold text-primary hover:bg-primary/10 ${focusClass}`}>Close</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className={cardClasses} aria-labelledby="pwa-install-title">
      <div className="flex items-start gap-3">
        <Image src="/images/pwa-192.png" alt="" width={48} height={48} className="size-12 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <h2 id="pwa-install-title" className="font-bold">{platform === "ios" ? "Add Apex to your Home Screen" : "Add Apex to your device"}</h2>
          <p className="mt-1 text-sm leading-5 text-muted">Shop business supplies faster next time.</p>
        </div>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => dismiss("not_now")} className={`min-h-11 rounded-lg px-4 text-sm font-semibold text-muted hover:text-foreground ${focusClass}`}>Not now</button>
        {platform === "ios" ? (
          <button type="button" onClick={() => { trackPwaInstallClicked("ios"); setShowIosInstructions(true); }} className={`min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 ${focusClass}`}>How to install</button>
        ) : (
          <button type="button" onClick={() => void handleInstall()} className={`min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90 ${focusClass}`}>Install</button>
        )}
      </div>
    </aside>
  );
}
