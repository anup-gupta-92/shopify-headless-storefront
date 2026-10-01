import assert from "node:assert/strict";
import { AsyncLocalStorage } from "node:async_hooks";
import test from "node:test";
import nextConfig from "../next.config.ts";

Object.assign(globalThis, { AsyncLocalStorage });

const { getRedirectUrl, unstable_getResponseFromNextConfig } = await import(
  "next/experimental/testing/server.js"
);

async function expectPermanentRedirect(source: string, destination: string) {
  const response = await unstable_getResponseFromNextConfig({
    url: `https://www.apexbusinesssupplies.co.uk${source}`,
    nextConfig,
  });

  assert.equal(response.status, 308);
  assert.equal(getRedirectUrl(response), destination);
}

test("collection-context product URLs redirect to the canonical product route", async () => {
  await expectPermanentRedirect(
    "/collections/safety-gear/products/aurelia-bold-powder-free-black-nitrile-gloves",
    "https://www.apexbusinesssupplies.co.uk/products/aurelia-bold-powder-free-black-nitrile-gloves",
  );
});

test("collection-context product redirects preserve the complete query string", async () => {
  await expectPermanentRedirect(
    "/collections/safety-gear/products/aurelia-bold-powder-free-black-nitrile-gloves?variant=44895417467104&utm_source=legacy",
    "https://www.apexbusinesssupplies.co.uk/products/aurelia-bold-powder-free-black-nitrile-gloves?variant=44895417467104&utm_source=legacy",
  );
});

test("legacy catalogue indexes redirect directly to the shop", async () => {
  await expectPermanentRedirect(
    "/collections?sort_by=best-selling",
    "https://www.apexbusinesssupplies.co.uk/shop?sort_by=best-selling",
  );
  await expectPermanentRedirect(
    "/products",
    "https://www.apexbusinesssupplies.co.uk/shop",
  );
  await expectPermanentRedirect(
    "/collections/all?page=2&grid_list=grid-view",
    "https://www.apexbusinesssupplies.co.uk/shop?page=2&grid_list=grid-view",
  );
});

test("legacy landing pages redirect to their direct replacements", async () => {
  const redirects = [
    ["/pages/high-quality-abrasives-for-every-need", "/collections/abrasives"],
    ["/pages/high-quality-abrasives-for-every-needs", "/collections/abrasives"],
    ["/pages/cleaning-products", "/collections/protection-cleaning"],
  ] as const;

  for (const [source, destination] of redirects) {
    await expectPermanentRedirect(
      source,
      `https://www.apexbusinesssupplies.co.uk${destination}`,
    );
  }
});

test("legacy order tracking redirects to the hosted customer account", async () => {
  await expectPermanentRedirect(
    "/pages/track-your-order?order=example",
    "https://account.apexbusinesssupplies.co.uk/?order=example",
  );
});
