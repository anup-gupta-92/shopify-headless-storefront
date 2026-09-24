import "server-only";

import { cache } from "react";
import sanitizeHtml from "sanitize-html";
import { storefrontRequest } from "./client";
import { SHOP_POLICIES_QUERY } from "./queries";
import type { ShopifyPolicy } from "./types";

export const POLICY_HANDLES = [
  "terms-of-service",
  "refund-policy",
  "privacy-policy",
  "shipping-policy",
] as const;

export type PolicyHandle = (typeof POLICY_HANDLES)[number];

type PolicyField = "termsOfService" | "refundPolicy" | "privacyPolicy" | "shippingPolicy";

const POLICY_FIELD_BY_HANDLE: Record<PolicyHandle, PolicyField> = {
  "terms-of-service": "termsOfService",
  "refund-policy": "refundPolicy",
  "privacy-policy": "privacyPolicy",
  "shipping-policy": "shippingPolicy",
};

interface ShopPoliciesResponse {
  shop: Record<PolicyField, ShopifyPolicy | null>;
}

export function isPolicyHandle(value: string): value is PolicyHandle {
  return POLICY_HANDLES.includes(value as PolicyHandle);
}

const getShopPolicies = cache(async () => {
  const data = await storefrontRequest<ShopPoliciesResponse>(
    SHOP_POLICIES_QUERY,
    {},
    { revalidate: 300, tags: ["shopify-policies"] },
  );
  return data.shop;
});

export async function getShopPolicy(handle: PolicyHandle): Promise<ShopifyPolicy | null> {
  const policies = await getShopPolicies();
  return policies[POLICY_FIELD_BY_HANDLE[handle]];
}

export function policyDescription(policy: ShopifyPolicy): string {
  const plainText = sanitizeHtml(policy.body, { allowedTags: [], allowedAttributes: {} })
    .replace(/\s+/g, " ")
    .trim();

  if (!plainText) return `Read the ${policy.title} for Apex Business Supplies.`;
  if (plainText.length <= 160) return plainText;

  const shortened = plainText.slice(0, 157).replace(/\s+\S*$/, "").trimEnd();
  return `${shortened || plainText.slice(0, 157).trimEnd()}…`;
}
