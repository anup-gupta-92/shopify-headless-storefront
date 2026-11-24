import { bindings, defineConfig, defineWorker, triggers } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "apex-business-supplies",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-10-01",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    workersDev: false,
    previewUrls: false,
    triggers: [
      triggers.fetch({
        pattern: "apexbusinesssupplies.co.uk/*",
        zone: "apexbusinesssupplies.co.uk",
      }),
      triggers.fetch({
        pattern: "www.apexbusinesssupplies.co.uk/*",
        zone: "apexbusinesssupplies.co.uk",
      }),
    ],
    observability: {
      enabled: true,
      logs: { enabled: true },
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      VINEXT_KV_CACHE: bindings.kv({
        id: "2d1527ad0453433d99893df9ce5a14c8",
      }),
      ANALYTICS_DB: bindings.d1({
        id: "bfa7116a-3210-42ac-a967-d0b5615c7cd6",
      }),
      SHOPIFY_STORE_DOMAIN: bindings.secret(),
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: bindings.secret(),
      SHOPIFY_STOREFRONT_PUBLIC_TOKEN: bindings.secret(),
      SHOPIFY_STOREFRONT_API_VERSION: bindings.text("2026-07"),
      SHOPIFY_ADMIN_CLIENT_ID: bindings.secret(),
      SHOPIFY_ADMIN_CLIENT_SECRET: bindings.secret(),
      SHOPIFY_ADMIN_API_VERSION: bindings.text("2026-10"),
      JUDGEME_SHOP_DOMAIN: bindings.secret(),
      JUDGEME_PUBLIC_TOKEN: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      CONTACT_FROM_EMAIL: bindings.secret(),
      CONTACT_TO_EMAIL: bindings.secret(),
    },
  }),
});
