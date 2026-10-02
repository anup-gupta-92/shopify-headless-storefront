import assert from "node:assert/strict";
import test from "node:test";
import { AGENT_DISCOVERY_MARKDOWN, agentDiscoveryResponse } from "../lib/agent-discovery.ts";
import {
  shopifyAgenticRequestHeaders,
  shopifyAgenticResponseHeaders,
  shopifyMcpUrl,
  shopifyUcpDiscoveryUrl,
} from "../lib/shopify/agentic-proxy.ts";

test("agent discovery describes the headless routes without advertising legacy JSON endpoints", async () => {
  for (const expected of [
    "https://www.apexbusinesssupplies.co.uk",
    "/.well-known/ucp",
    "/shop",
    "/products/{handle}",
    "/collections/{handle}",
    "/search?q={query}&type=product",
    "/policies/shipping-policy",
    "/policies/refund-policy",
    "/policies/privacy-policy",
    "/policies/terms-of-service",
    "Buyer approval is required",
  ]) assert.match(AGENT_DISCOVERY_MARKDOWN, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));

  assert.doesNotMatch(AGENT_DISCOVERY_MARKDOWN, /products\/\{handle\}\.json/);
  assert.doesNotMatch(AGENT_DISCOVERY_MARKDOWN, /collections\/\{handle\}\/products\.json/);

  const response = agentDiscoveryResponse();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
  assert.equal(await response.text(), AGENT_DISCOVERY_MARKDOWN);
});

test("Shopify agentic upstream URLs are fixed and MCP query parameters are preserved", () => {
  assert.equal(
    shopifyUcpDiscoveryUrl("example.myshopify.com").toString(),
    "https://example.myshopify.com/.well-known/ucp",
  );
  assert.equal(
    shopifyMcpUrl("example.myshopify.com", "https://attacker.example/api/ucp/mcp?version=latest").toString(),
    "https://example.myshopify.com/api/ucp/mcp?version=latest",
  );
});

test("MCP request forwarding is allowlisted and excludes cookies, Cloudflare headers, and private tokens", () => {
  const request = new Request("https://www.apexbusinesssupplies.co.uk/api/ucp/mcp", {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: "Bearer external-agent-token",
      "Content-Type": "application/json",
      "Content-Digest": "sha-256=:example:",
      Signature: "sig1=:example:",
      "Signature-Input": "sig1=(\"content-digest\")",
      Cookie: "cart=private",
      "CF-Connecting-IP": "203.0.113.1",
      "Shopify-Storefront-Private-Token": "must-not-forward",
      "X-Unrelated-Header": "must-not-forward",
    },
  });
  const headers = shopifyAgenticRequestHeaders(request, "mcp");

  assert.equal(headers.get("accept"), "application/json");
  assert.equal(headers.get("authorization"), "Bearer external-agent-token");
  assert.equal(headers.get("content-digest"), "sha-256=:example:");
  assert.equal(headers.get("signature"), "sig1=:example:");
  assert.equal(headers.get("signature-input"), "sig1=(\"content-digest\")");
  assert.equal(headers.has("cookie"), false);
  assert.equal(headers.has("cf-connecting-ip"), false);
  assert.equal(headers.has("shopify-storefront-private-token"), false);
  assert.equal(headers.has("x-unrelated-header"), false);
});

test("proxy response headers preserve protocol and cache policy without forwarding cookies", () => {
  const upstream = new Response("{}", {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=60",
      "Access-Control-Allow-Origin": "*",
      Vary: "Accept",
      ETag: "example",
      "MCP-Session-Id": "session",
      "X-Shopify-UCP-MCP-API-Version": "2026-08-25",
      "Retry-After": "10",
      "Set-Cookie": "shopify=value",
      "Server-Timing": "private-detail",
    },
  });
  const headers = shopifyAgenticResponseHeaders(upstream);

  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(headers.get("cache-control"), "public, max-age=60");
  assert.equal(headers.get("access-control-allow-origin"), "*");
  assert.equal(headers.get("mcp-session-id"), "session");
  assert.equal(headers.get("x-shopify-ucp-mcp-api-version"), "2026-08-25");
  assert.equal(headers.has("set-cookie"), false);
  assert.equal(headers.has("server-timing"), false);
});
