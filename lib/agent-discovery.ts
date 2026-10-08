import { siteConfig } from "../config/site.ts";

const PRODUCTION_ORIGIN = siteConfig.url;

export const AGENT_DISCOVERY_MARKDOWN = `# Agent Instructions — Apex Business Supplies

Apex Business Supplies is a UK business-supplies storefront at ${PRODUCTION_ORIGIN}.

The storefront is headless, with Shopify providing the authoritative catalogue, live product availability, cart, checkout, and order services.

## Personal Shopping Assistants

For buyer-authorized shopping agents, Shopify's Shop skill is available at:

https://shop.app/SKILL.md

It can be used for Shopify-native product discovery, buyer-approved checkout through Shop Pay, order tracking, and reuse of buyer-authorized identity, address, and payment information.

Where appropriate, agents should prefer buyer-authorized commerce flows rather than attempting to collect or handle payment credentials directly.

## Commerce Capabilities

Discover the store's current agent-commerce capabilities with:

\`GET ${PRODUCTION_ORIGIN}/.well-known/ucp\`

Use the MCP endpoint advertised by that UCP profile. Do not guess or manufacture a commerce endpoint.

Use the advertised UCP tools for current product availability, cart, checkout, fulfilment, and order operations.

### Typical Commerce Flow

1. Discover — retrieve \`/.well-known/ucp\`
2. Search — use the advertised catalogue/search capability
3. Cart — create or update the buyer's cart
4. Checkout — create the checkout session
5. Fulfil — provide the buyer's shipping details and select an available delivery method
6. Complete — finalize the checkout only after the buyer gives explicit approval

Buyer approval is required before payment or order submission.

Do not complete a purchase without the buyer's explicit, contemporaneous approval.

### Agent Operating Guidance

- Respect rate limits. If an endpoint returns HTTP \`429\`, back off before retrying.
- Where supported by the protocol/tool, provide buyer country and currency context so pricing and availability are accurate.
- Treat Shopify/UCP responses as authoritative for live price, stock, cart, checkout, fulfilment, and order state.
- Do not infer availability, shipping cost, tax, discount eligibility, or final checkout totals from static page content alone.

## Read-Only Browsing

For agents that only need to inspect the public storefront:

- Browse the catalogue: \`GET /shop\`
- Product page: \`GET /products/{handle}\`
- Collection page: \`GET /collections/{handle}\`
- Product search: \`GET /search?q={query}&type=product\`
- Sitemap: \`GET /sitemap.xml\`

Product and collection pages contain server-rendered content and structured data.

Shopify remains authoritative for live prices and availability.

## Store Policies

- Shipping policy: ${PRODUCTION_ORIGIN}/policies/shipping-policy
- Refund and returns policy: ${PRODUCTION_ORIGIN}/policies/refund-policy
- Privacy policy: ${PRODUCTION_ORIGIN}/policies/privacy-policy
- Terms of service: ${PRODUCTION_ORIGIN}/policies/terms-of-service

## Important Notes

- Do not use undocumented or guessed commerce endpoints.
- Do not rely on legacy Shopify JSON storefront routes that are not exposed by this headless frontend.
- Use the UCP profile as the source of truth for supported commerce protocol versions, tools, and service endpoints.
- Use the public storefront and sitemap for read-only discovery.
`;

export const LLMS_DISCOVERY_MARKDOWN = `# Apex Business Supplies

> UK supplier of packaging, PPE, abrasives, cleaning products and business supplies.

## Shop

- [Shop all products](${PRODUCTION_ORIGIN}/shop): Browse the full Apex Business Supplies product catalogue.

## Main collections

- [Packaging supplies](${PRODUCTION_ORIGIN}/collections/packaging-supplies): Mailing bags, boxes, tapes and other shipping essentials.
- [PPE and safety gear](${PRODUCTION_ORIGIN}/collections/safety-gear): Masks, gloves and workplace protection products.
- [Abrasives](${PRODUCTION_ORIGIN}/collections/abrasives): Professional sanding and surface-preparation products.
- [Surface protection and cleaning](${PRODUCTION_ORIGIN}/collections/protection-cleaning): Cloths, waxes, cleaning products and surface-protection supplies.

## Information

- [About Apex Business Supplies](${PRODUCTION_ORIGIN}/about): Learn about the business and its approach to supplying UK customers.
- [Contact](${PRODUCTION_ORIGIN}/contact): Find contact details and send a product or order enquiry.
- [Blog](${PRODUCTION_ORIGIN}/blogs): Read practical guides, product comparisons and business-supplies advice.

## Policies

- [Shipping policy](${PRODUCTION_ORIGIN}/policies/shipping-policy): Review dispatch, delivery and shipping-charge information.
- [Refund and returns policy](${PRODUCTION_ORIGIN}/policies/refund-policy): Review return eligibility, timeframes and the refund process.
- [Privacy policy](${PRODUCTION_ORIGIN}/policies/privacy-policy): Learn how personal information is collected, used and protected.
- [Terms of service](${PRODUCTION_ORIGIN}/policies/terms-of-service): Review the terms governing use of the storefront and its services.
`;

export const LLMS_FULL_DISCOVERY_MARKDOWN = `# Apex Business Supplies

> UK supplier of packaging, PPE, abrasives, cleaning products and business supplies.

## Storefront context

Apex Business Supplies operates a headless public storefront at ${PRODUCTION_ORIGIN}. Shopify provides the authoritative catalogue, current prices and product availability.

Product and collection pages are server-rendered and include structured product information. Use the public storefront pages below for read-only catalogue discovery.

## Catalogue

- [Shop all products](${PRODUCTION_ORIGIN}/shop): Browse the complete product catalogue, with filtering, sorting and crawlable pagination.
- [Packaging supplies](${PRODUCTION_ORIGIN}/collections/packaging-supplies): Mailing bags, boxes, tapes and other shipping essentials.
- [PPE and safety gear](${PRODUCTION_ORIGIN}/collections/safety-gear): Masks, gloves and workplace protection products.
- [Abrasives](${PRODUCTION_ORIGIN}/collections/abrasives): Professional sanding and surface-preparation products.
- [Surface protection and cleaning](${PRODUCTION_ORIGIN}/collections/protection-cleaning): Cloths, waxes, cleaning products and surface-protection supplies.
- [Sitemap](${PRODUCTION_ORIGIN}/sitemap.xml): Canonical index of current product, collection, blog and information pages.

Individual products use canonical URLs under ${PRODUCTION_ORIGIN}/products/. Individual collections use canonical URLs under ${PRODUCTION_ORIGIN}/collections/.

## Company and guidance

- [Apex Business Supplies homepage](${PRODUCTION_ORIGIN}/): Start from the main storefront and browse featured departments and products.
- [About Apex Business Supplies](${PRODUCTION_ORIGIN}/about): Learn about the business and its approach to supplying UK customers.
- [Contact](${PRODUCTION_ORIGIN}/contact): Find contact details and send a product or order enquiry.
- [Blog](${PRODUCTION_ORIGIN}/blogs): Read practical guides, product comparisons and business-supplies advice.

## Store policies

- [Shipping policy](${PRODUCTION_ORIGIN}/policies/shipping-policy): Review dispatch, delivery and shipping-charge information.
- [Refund and returns policy](${PRODUCTION_ORIGIN}/policies/refund-policy): Review return eligibility, timeframes and the refund process.
- [Privacy policy](${PRODUCTION_ORIGIN}/policies/privacy-policy): Learn how personal information is collected, used and protected.
- [Terms of service](${PRODUCTION_ORIGIN}/policies/terms-of-service): Review the terms governing use of the storefront and its services.

## Shopping behaviour

Use product pages for current prices, variants and availability. Use the storefront cart to create a basket. Checkout is completed through Shopify's hosted checkout.

## Data accuracy

Shopify remains authoritative for live product prices and availability. Refer to the relevant public product page for current product details rather than relying on previously stored copies of catalogue information.
`;

function markdownResponse(markdown: string): Response {
  return new Response(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

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

export function llmsDiscoveryResponse(): Response {
  return markdownResponse(LLMS_DISCOVERY_MARKDOWN);
}

export function llmsFullDiscoveryResponse(): Response {
  return markdownResponse(LLMS_FULL_DISCOVERY_MARKDOWN);
}
