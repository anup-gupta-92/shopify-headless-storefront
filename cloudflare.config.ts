import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "apex-business-supplies",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-09-30",
    compatibilityFlags: ["nodejs_compat"],
    assets: { notFoundHandling: "none" },
    env: {
      ASSETS: bindings.assets(),
      VINEXT_KV_CACHE: bindings.kv(),
      SHOPIFY_STORE_DOMAIN: bindings.secret(),
      SHOPIFY_STOREFRONT_PRIVATE_TOKEN: bindings.secret(),
      SHOPIFY_STOREFRONT_API_VERSION: bindings.secret(),
      SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID: bindings.secret(),
      JUDGEME_SHOP_DOMAIN: bindings.secret(),
      JUDGEME_PUBLIC_TOKEN: bindings.secret(),
      RESEND_API_KEY: bindings.secret(),
      CONTACT_FROM_EMAIL: bindings.secret(),
      CONTACT_TO_EMAIL: bindings.secret(),
    },
  }),
});
