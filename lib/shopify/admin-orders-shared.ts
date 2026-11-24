export const SHOPIFY_ORDER_MATCH_DEFAULT_WINDOW_SECONDS = 2 * 60 * 60;
export const SHOPIFY_ORDER_MATCH_MAX_WINDOW_SECONDS = 24 * 60 * 60;
export const SHOPIFY_ORDER_MATCH_LIMIT = 50;
export const SHOPIFY_ORDER_LINE_LIMIT = 100;

export const SHOPIFY_RECENT_ORDERS_QUERY = `
  query ApexAnalyticsRecentOrders($first: Int!, $search: String!) {
    orders(first: $first, query: $search, sortKey: CREATED_AT) {
      nodes {
        id
        name
        createdAt
        displayFinancialStatus
        totalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: ${SHOPIFY_ORDER_LINE_LIMIT}) {
          nodes {
            name
            quantity
            sku
            variantTitle
          }
          pageInfo { hasNextPage }
        }
      }
      pageInfo { hasNextPage }
    }
  }
`;

export interface ShopifyAdminOrderLine {
  name: string;
  quantity: number;
  sku: string | null;
  variantId: string | null;
  variantTitle: string | null;
}

export interface ShopifyAdminOrderSummary {
  id: string;
  name: string;
  createdAt: string;
  createdAtSeconds: number;
  financialStatus: string | null;
  totalAmount: string;
  currencyCode: string;
  lines: ShopifyAdminOrderLine[];
  linesTruncated: boolean;
}

export interface ShopifyAdminOrderResult {
  orders: ShopifyAdminOrderSummary[];
  ordersTruncated: boolean;
}

function text(value: unknown, maximumLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= maximumLength ? normalized : null;
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function pageHasNext(value: unknown): boolean {
  return object(value)?.hasNextPage === true;
}

function parseOrderLine(value: unknown): ShopifyAdminOrderLine | null {
  const line = object(value);
  if (!line) return null;
  const name = text(line.name, 500);
  const quantity = line.quantity;
  if (!name || typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 0) {
    return null;
  }
  return {
    name,
    quantity,
    sku: text(line.sku, 255),
    variantId: null,
    variantTitle: text(line.variantTitle, 500),
  };
}

function parseOrder(value: unknown): ShopifyAdminOrderSummary | null {
  const order = object(value);
  if (!order) return null;
  const id = text(order.id, 255);
  const name = text(order.name, 100);
  const createdAt = text(order.createdAt, 64);
  const createdAtMs = createdAt ? Date.parse(createdAt) : Number.NaN;
  const money = object(object(order.totalPriceSet)?.shopMoney);
  const totalAmount = text(money?.amount, 64);
  const currencyCode = text(money?.currencyCode, 3);
  if (!id || !name || !createdAt || !Number.isFinite(createdAtMs) || !totalAmount || !/^\d+(?:\.\d+)?$/.test(totalAmount) || !currencyCode || !/^[A-Z]{3}$/.test(currencyCode)) {
    return null;
  }
  const lineItems = object(order.lineItems);
  const rawLines = Array.isArray(lineItems?.nodes) ? lineItems.nodes : [];
  return {
    id,
    name,
    createdAt,
    createdAtSeconds: Math.floor(createdAtMs / 1_000),
    financialStatus: text(order.displayFinancialStatus, 64),
    totalAmount,
    currencyCode,
    lines: rawLines.map(parseOrderLine).filter((line): line is ShopifyAdminOrderLine => line !== null),
    linesTruncated: pageHasNext(lineItems?.pageInfo),
  };
}

export function shopifyOrderCreatedAtSearch(startAtSeconds: number, endAtSeconds: number): string {
  if (!Number.isSafeInteger(startAtSeconds) || !Number.isSafeInteger(endAtSeconds) || endAtSeconds <= startAtSeconds) {
    throw new Error("invalid_shopify_order_window");
  }
  if (endAtSeconds - startAtSeconds > SHOPIFY_ORDER_MATCH_MAX_WINDOW_SECONDS) {
    throw new Error("shopify_order_window_too_large");
  }
  return `created_at:>='${new Date(startAtSeconds * 1_000).toISOString()}' created_at:<='${new Date(endAtSeconds * 1_000).toISOString()}'`;
}

export function parseShopifyAdminOrders(value: unknown): ShopifyAdminOrderResult {
  const orders = object(object(value)?.orders);
  if (!orders || !Array.isArray(orders.nodes)) throw new Error("invalid_shopify_admin_orders_response");
  return {
    orders: orders.nodes.map(parseOrder).filter((order): order is ShopifyAdminOrderSummary => order !== null),
    ordersTruncated: pageHasNext(orders.pageInfo),
  };
}
