import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import manifest from "../app/manifest.ts";
import {
  hasActivePwaDismissal,
  isInstallPromptSuppressedPath,
  isLikelyAppleMobile,
  isPwaStandalone,
  PWA_DISMISSAL_MS,
  shouldShowPwaInstallPromotion,
} from "../lib/pwa.ts";

test("manifest contains the production install identity and expected icons", () => {
  const value = manifest();
  assert.equal(value.name, "Apex Business Supplies");
  assert.equal(value.short_name, "Apex");
  assert.equal(value.id, "/");
  assert.equal(value.start_url, "/");
  assert.equal(value.scope, "/");
  assert.equal(value.display, "standalone");
  assert.equal(value.lang, "en-GB");
  assert.deepEqual(value.categories, ["business", "shopping"]);
  assert.equal(value.prefer_related_applications, false);
  assert.deepEqual(value.icons, [
    { src: "/images/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/images/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/images/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ]);
});

test("supplied PNG assets have the expected dimensions", async () => {
  const expected = new Map([
    ["pwa-192.png", [192, 192]],
    ["pwa-512.png", [512, 512]],
    ["pwa-maskable-512.png", [512, 512]],
    ["apple-touch-icon.png", [180, 180]],
    ["favicon.png", [192, 192]],
  ]);

  for (const [filename, [width, height]] of expected) {
    const image = await readFile(new URL(`../public/images/${filename}`, import.meta.url));
    assert.deepEqual([...image.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10], filename);
    assert.equal(image.readUInt32BE(16), width, `${filename} width`);
    assert.equal(image.readUInt32BE(20), height, `${filename} height`);
  }
});

test("dismissal remains active for 30 days and expires at the boundary", () => {
  const now = Date.UTC(2026, 9, 7);
  assert.equal(hasActivePwaDismissal(String(now), now + PWA_DISMISSAL_MS - 1), true);
  assert.equal(hasActivePwaDismissal(String(now), now + PWA_DISMISSAL_MS), false);
  assert.equal(hasActivePwaDismissal("invalid", now), false);
});

test("Apple mobile detection covers iPhone and desktop-UA iPad without matching a Mac", () => {
  assert.equal(isLikelyAppleMobile({ userAgent: "Mozilla/5.0 (iPhone)", platform: "iPhone", maxTouchPoints: 5 }), true);
  assert.equal(isLikelyAppleMobile({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 5 }), true);
  assert.equal(isLikelyAppleMobile({ userAgent: "Mozilla/5.0 (Macintosh)", platform: "MacIntel", maxTouchPoints: 0 }), false);
});

test("standalone detection supports display-mode and Apple's standalone property", () => {
  assert.equal(isPwaStandalone({ displayModeStandalone: true }), true);
  assert.equal(isPwaStandalone({ displayModeStandalone: false, appleStandalone: true }), true);
  assert.equal(isPwaStandalone({ displayModeStandalone: false, appleStandalone: false }), false);
});

test("cart and cart permalink routes suppress the install promotion", () => {
  assert.equal(isInstallPromptSuppressedPath("/cart"), true);
  assert.equal(isInstallPromptSuppressedPath("/cart/123:1"), true);
  assert.equal(isInstallPromptSuppressedPath("/shop"), false);
});

test("install promotion requires interaction and either two visits or 30 visible seconds", () => {
  const eligible = {
    dismissalChecked: true,
    dismissed: false,
    standalone: false,
    blockedByUi: false,
    installPathAvailable: true,
    interacted: true,
    visitCount: 1,
    timeThresholdMet: false,
  };
  assert.equal(shouldShowPwaInstallPromotion(eligible), false);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, visitCount: 2 }), true);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, timeThresholdMet: true }), true);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, visitCount: 2, interacted: false }), false);
});

test("standalone, dismissal, unavailable install paths, and competing UI suppress promotion", () => {
  const eligible = {
    dismissalChecked: true,
    dismissed: false,
    standalone: false,
    blockedByUi: false,
    installPathAvailable: true,
    interacted: true,
    visitCount: 2,
    timeThresholdMet: false,
  };
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, standalone: true }), false);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, dismissed: true }), false);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, installPathAvailable: false }), false);
  assert.equal(shouldShowPwaInstallPromotion({ ...eligible, blockedByUi: true }), false);
});
