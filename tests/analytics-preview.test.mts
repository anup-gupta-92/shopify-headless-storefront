import test from "node:test";
import assert from "node:assert/strict";
import {
  activateAnalyticsPreview,
  deactivateAnalyticsPreview,
  isAnalyticsPreviewActive,
} from "../lib/analytics/preview.ts";

function withBrowserState(href: string, previewStored: boolean, callback: () => void) {
  const session = new Map<string, string>();
  const local = new Map<string, string>();
  if (previewStored) session.set("apex:analytics:preview", "true");
  const consent = encodeURIComponent(JSON.stringify({
    version: 1,
    necessary: true,
    analytics: true,
    marketing: false,
    decided: true,
  }));
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: new URL(href),
      localStorage: {
        getItem: (key: string) => local.get(key) ?? null,
        setItem: (key: string, value: string) => local.set(key, value),
      },
      sessionStorage: {
        getItem: (key: string) => session.get(key) ?? null,
        setItem: (key: string, value: string) => session.set(key, value),
        removeItem: (key: string) => session.delete(key),
      },
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { cookie: `apex_cookie_consent=${consent}` },
  });
  try {
    callback();
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
  }
}

test("analytics_preview URL mode suppresses first-party analytics immediately", () => {
  withBrowserState("https://www.apexbusinesssupplies.co.uk/search?q=boxes&analytics_preview=1", false, () => {
    assert.equal(isAnalyticsPreviewActive(), true);
  });
});

test("the tab-scoped preview flag persists suppression without the URL parameter", () => {
  withBrowserState("https://www.apexbusinesssupplies.co.uk/products/example", true, () => {
    assert.equal(isAnalyticsPreviewActive(), true);
  });
});

test("normal storefront URLs do not activate preview mode", () => {
  withBrowserState("https://www.apexbusinesssupplies.co.uk/shop", false, () => {
    assert.equal(isAnalyticsPreviewActive(), false);
  });
});

test("activation persists only in sessionStorage and deactivation clears it", () => {
  withBrowserState("https://www.apexbusinesssupplies.co.uk/shop", false, () => {
    activateAnalyticsPreview();
    assert.equal(isAnalyticsPreviewActive(), true);
    assert.equal(window.localStorage.getItem("apex:analytics:preview"), null);
    deactivateAnalyticsPreview();
    assert.equal(isAnalyticsPreviewActive(), false);
  });
});
