import { siteConfig } from "../config/site.ts";

const PRODUCTION_ORIGIN = siteConfig.url;

export const AGENT_DISCOVERY_MARKDOWN = `# Agent Instructions — Apex Business Supplies

Apex Business Supplies is a UK business-supplies storefront at ${PRODUCTION_ORIGIN}. The storefront is headless, with Shopify providing the authoritative catalogue, cart, checkout, and order services.

## Commerce capabilities

- Discover the store's current commerce capabilities with \`GET ${PRODUCTION_ORIGIN}/.well-known/ucp\`.
- Use the MCP endpoint advertised by that UCP profile. Do not guess or manufacture a commerce endpoint.
- Use the advertised UCP tools for current product availability, cart, checkout, and order operations.
- Buyer approval is required before payment or order submission. Do not complete a purchase without the buyer's explicit, contemporaneous approval.

## Read-only browsing

- Browse the catalogue: \`GET /shop\`
- Product page: \`GET /products/{handle}\`
- Collection page: \`GET /collections/{handle}\`
- Product search: \`GET /search?q={query}&type=product\`
- Sitemap: \`GET /sitemap.xml\`

Product pages and collection pages contain server-rendered content and structured data. Shopify remains authoritative for live prices and availability.

## Store policies

- Shipping policy: ${PRODUCTION_ORIGIN}/policies/shipping-policy
- Refund and returns policy: ${PRODUCTION_ORIGIN}/policies/refund-policy
- Privacy policy: ${PRODUCTION_ORIGIN}/policies/privacy-policy
- Terms of service: ${PRODUCTION_ORIGIN}/policies/terms-of-service
`;

export function agentDiscoveryResponse(): Response {
  return new Response(AGENT_DISCOVERY_MARKDOWN, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
