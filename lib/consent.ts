export const CONSENT_COOKIE_NAME = "apex_cookie_consent";
export const CONSENT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;
export const CONSENT_CHANGE_EVENT = "apex:consent-changed";

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentPreferences {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: true;
}

interface StoredConsent extends ConsentPreferences {
  version: 1;
}

function normalizeConsent(value: unknown): ConsentPreferences | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<StoredConsent>;
  if (
    candidate.version !== 1
    || candidate.decided !== true
    || typeof candidate.analytics !== "boolean"
    || typeof candidate.marketing !== "boolean"
  ) return null;

  return {
    necessary: true,
    analytics: candidate.analytics,
    marketing: candidate.marketing,
    decided: true,
  };
}

export function readConsentCookie(cookieHeader: string): ConsentPreferences | null {
  const prefix = `${CONSENT_COOKIE_NAME}=`;
  const encoded = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
  if (!encoded) return null;

  try {
    return normalizeConsent(JSON.parse(decodeURIComponent(encoded)));
  } catch {
    return null;
  }
}

export function getStoredConsent(): ConsentPreferences | null {
  if (typeof document === "undefined") return null;
  return readConsentCookie(document.cookie);
}

export function persistConsent(preferences: Omit<ConsentPreferences, "necessary" | "decided">): ConsentPreferences {
  const normalized: ConsentPreferences = {
    necessary: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    decided: true,
  };

  if (typeof document !== "undefined") {
    const stored: StoredConsent = { version: 1, ...normalized };
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(stored))}; Path=/; Max-Age=${CONSENT_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
    window.dispatchEvent(new CustomEvent<ConsentPreferences>(CONSENT_CHANGE_EVENT, { detail: normalized }));
  }

  return normalized;
}

export function hasConsent(preferences: ConsentPreferences | null, category: ConsentCategory): boolean {
  if (category === "necessary") return true;
  return preferences?.decided === true && preferences[category] === true;
}
