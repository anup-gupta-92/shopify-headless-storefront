export const PWA_DISMISSAL_STORAGE_KEY = "apex:pwa-install-dismissed-at";
export const PWA_VISIT_COUNT_STORAGE_KEY = "apex:pwa-storefront-visits";
export const PWA_LAST_PATH_STORAGE_KEY = "apex:pwa-last-path";
export const PWA_DISMISSAL_MS = 30 * 24 * 60 * 60 * 1000;
export const PWA_ENGAGEMENT_MS = 30 * 1000;

interface AppleMobileEnvironment {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
}

interface StandaloneEnvironment {
  displayModeStandalone: boolean;
  appleStandalone?: boolean;
}

interface InstallPromotionEligibility {
  dismissalChecked: boolean;
  dismissed: boolean;
  standalone: boolean;
  blockedByUi: boolean;
  installPathAvailable: boolean;
  interacted: boolean;
  visitCount: number;
  timeThresholdMet: boolean;
}

export function hasActivePwaDismissal(value: string | null, now = Date.now()) {
  if (!value) return false;
  const dismissedAt = Number(value);
  return Number.isFinite(dismissedAt)
    && dismissedAt > 0
    && now >= dismissedAt
    && now - dismissedAt < PWA_DISMISSAL_MS;
}

export function isLikelyAppleMobile(environment: AppleMobileEnvironment) {
  const { userAgent, platform, maxTouchPoints } = environment;
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (platform === "MacIntel" && maxTouchPoints > 1);
}

export function isPwaStandalone(environment: StandaloneEnvironment) {
  return environment.displayModeStandalone || environment.appleStandalone === true;
}

export function isInstallPromptSuppressedPath(pathname: string) {
  return pathname === "/cart" || pathname.startsWith("/cart/");
}

export function shouldShowPwaInstallPromotion({
  dismissalChecked,
  dismissed,
  standalone,
  blockedByUi,
  installPathAvailable,
  interacted,
  visitCount,
  timeThresholdMet,
}: InstallPromotionEligibility) {
  return dismissalChecked
    && !dismissed
    && !standalone
    && !blockedByUi
    && installPathAvailable
    && interacted
    && (visitCount >= 2 || timeThresholdMet);
}
