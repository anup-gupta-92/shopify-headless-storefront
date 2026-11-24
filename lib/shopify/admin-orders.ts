import "server-only";

import { shopifyAdminGraphqlRequest } from "./admin-client";
import {
  parseShopifyAdminOrders,
  SHOPIFY_ORDER_MATCH_LIMIT,
  SHOPIFY_RECENT_ORDERS_QUERY,
  shopifyOrderCreatedAtSearch,
  type ShopifyAdminOrderResult,
} from "./admin-orders-shared";

export async function getShopifyOrdersCreatedBetween(
  startAtSeconds: number,
  endAtSeconds: number,
): Promise<ShopifyAdminOrderResult> {
  const search = shopifyOrderCreatedAtSearch(startAtSeconds, endAtSeconds);
  const data = await shopifyAdminGraphqlRequest<unknown>(SHOPIFY_RECENT_ORDERS_QUERY, {
    first: SHOPIFY_ORDER_MATCH_LIMIT,
    search,
  });
  return parseShopifyAdminOrders(data);
}
