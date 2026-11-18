"use client";

const CONSENT_API_SRC = "https://cdn.shopify.com/shopifycloud/consent-tracking-api/v0.1/consent-tracking-api.js";
const CONSENT_FEATURE = { name: "consent-tracking-api", version: "1.0" } as const;
const SHOPIFY_API_TIMEOUT_MS = 10_000;

type ShopifyVisitorConsentValue = "" | "yes" | "no";

export interface ShopifyVisitorConsent {
  analytics: ShopifyVisitorConsentValue;
  marketing: ShopifyVisitorConsentValue;
  preferences: ShopifyVisitorConsentValue;
  sale_of_data: ShopifyVisitorConsentValue;
}

interface ShopifyTrackingConsentInput {
  analytics: boolean;
  marketing: boolean;
  headlessStorefront: true;
  checkoutRootDomain: string;
  storefrontRootDomain: string;
  storefrontAccessToken: string;
}

interface ShopifyTrackingConsentResult {
  error?: string;
}

interface ShopifyCustomerPrivacy {
  setTrackingConsent(
    consent: ShopifyTrackingConsentInput,
    callback: (result?: ShopifyTrackingConsentResult) => void,
  ): void;
  currentVisitorConsent(): ShopifyVisitorConsent;
  analyticsProcessingAllowed(): boolean;
  marketingAllowed(): boolean;
}

interface ShopifyGlobal {
  loadFeatures?: (
    features: Array<{ name: string; version: string }>,
    callback: (error?: unknown) => void,
  ) => void;
  customerPrivacy?: ShopifyCustomerPrivacy;
}

declare global {
  interface Window {
    Shopify?: ShopifyGlobal;
  }
}

interface ShopifyConsentSyncInput {
  analytics: boolean;
  marketing: boolean;
  storefrontAccessToken: string;
}

let customerPrivacyPromise: Promise<ShopifyCustomerPrivacy> | null = null;

function customerPrivacyApi(): ShopifyCustomerPrivacy | null {
  return window.Shopify?.customerPrivacy ?? null;
}

function waitForScript(script: HTMLScriptElement): Promise<void> {
  return new Promise((resolve, reject) => {
    if (customerPrivacyApi()) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Shopify Customer Privacy script timed out"));
    }, SHOPIFY_API_TIMEOUT_MS);
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("Shopify Customer Privacy script failed to load"));
    };
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };

    script.addEventListener("load", handleLoad, { once: true });
    script.addEventListener("error", handleError, { once: true });
  });
}

async function loadOfficialConsentScript(): Promise<void> {
  const existing = Array.from(document.scripts).find((script) => script.src === CONSENT_API_SRC);
  if (existing) {
    await waitForScript(existing);
    return;
  }

  const script = document.createElement("script");
  script.src = CONSENT_API_SRC;
  script.async = true;
  script.dataset.apexShopifyCustomerPrivacy = "true";
  const loaded = waitForScript(script);
  document.head.appendChild(script);
  await loaded;
}

function loadConsentFeature(): Promise<void> {
  const loadFeatures = window.Shopify?.loadFeatures;
  if (!loadFeatures) return loadOfficialConsentScript();

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(
      () => reject(new Error("Shopify Customer Privacy feature timed out")),
      SHOPIFY_API_TIMEOUT_MS,
    );
    try {
      loadFeatures([CONSENT_FEATURE], (error) => {
        window.clearTimeout(timeout);
        if (error) reject(new Error("Shopify Customer Privacy feature failed to load"));
        else resolve();
      });
    } catch (error) {
      window.clearTimeout(timeout);
      reject(error);
    }
  });
}

export function loadShopifyCustomerPrivacy(): Promise<ShopifyCustomerPrivacy> {
  if (typeof window === "undefined") return Promise.reject(new Error("Shopify Customer Privacy is browser-only"));
  const ready = customerPrivacyApi();
  if (ready) return Promise.resolve(ready);
  if (customerPrivacyPromise) return customerPrivacyPromise;

  window.Shopify ??= {};
  customerPrivacyPromise = loadConsentFeature()
    .then(() => {
      const api = customerPrivacyApi();
      if (!api) throw new Error("Shopify Customer Privacy API is unavailable");
      return api;
    })
    .catch((error) => {
      customerPrivacyPromise = null;
      throw error;
    });
  return customerPrivacyPromise;
}

export async function syncShopifyCustomerPrivacy(
  input: ShopifyConsentSyncInput,
): Promise<ShopifyVisitorConsent | null> {
  try {
    const storefrontAccessToken = input.storefrontAccessToken.trim();
    if (!storefrontAccessToken) throw new Error("Shopify public Storefront access token is unavailable");
    const api = await loadShopifyCustomerPrivacy();

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(
        () => reject(new Error("Shopify consent submission timed out")),
        SHOPIFY_API_TIMEOUT_MS,
      );
      api.setTrackingConsent({
        analytics: input.analytics,
        marketing: input.marketing,
        headlessStorefront: true,
        checkoutRootDomain: "checkout.apexbusinesssupplies.co.uk",
        storefrontRootDomain: "apexbusinesssupplies.co.uk",
        storefrontAccessToken,
      }, (result) => {
        window.clearTimeout(timeout);
        if (result?.error) reject(new Error("Shopify rejected the consent submission"));
        else resolve();
      });
    });

    return api.currentVisitorConsent();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Shopify Customer Privacy synchronization failed", error);
    }
    return null;
  }
}
