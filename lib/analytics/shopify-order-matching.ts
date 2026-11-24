import type { ShopifyAdminOrderSummary } from "@/lib/shopify/admin-orders-shared";

export const SHOPIFY_ORDER_MATCH_WINDOWS_HOURS = [2, 6, 24] as const;
export type ShopifyOrderMatchWindowHours = (typeof SHOPIFY_ORDER_MATCH_WINDOWS_HOURS)[number];

export type CheckoutStartReference = {
  eventId: string;
  occurredAt: number;
};

type SearchValue = string | string[] | undefined;

function firstValue(value: SearchValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseShopifyOrderMatchRequest(
  searchParams: Record<string, SearchValue>,
): { checkoutEventId: string | null; windowHours: ShopifyOrderMatchWindowHours } {
  const requestedEvent = firstValue(searchParams.checkoutEvent)?.trim();
  const requestedWindow = Number.parseInt(firstValue(searchParams.orderWindow) ?? "2", 10);
  return {
    checkoutEventId: requestedEvent && requestedEvent.length <= 128 ? requestedEvent : null,
    windowHours: SHOPIFY_ORDER_MATCH_WINDOWS_HOURS.includes(
      requestedWindow as ShopifyOrderMatchWindowHours,
    )
      ? requestedWindow as ShopifyOrderMatchWindowHours
      : 2,
  };
}

export function selectCheckoutStart(
  events: readonly CheckoutStartReference[],
  requestedEventId: string | null,
): CheckoutStartReference | null {
  if (!events.length) return null;
  if (requestedEventId) {
    const requested = events.find((event) => event.eventId === requestedEventId);
    if (requested) return requested;
  }
  return events.reduce((latest, event) => event.occurredAt > latest.occurredAt ? event : latest);
}

export function sortOrdersByCheckoutProximity(
  orders: readonly ShopifyAdminOrderSummary[],
  checkoutStartedAt: number,
): ShopifyAdminOrderSummary[] {
  return [...orders].sort((left, right) => {
    const leftDifference = Math.abs(left.createdAtSeconds - checkoutStartedAt);
    const rightDifference = Math.abs(right.createdAtSeconds - checkoutStartedAt);
    return leftDifference - rightDifference || left.createdAtSeconds - right.createdAtSeconds;
  });
}

export function formatOrderMatchDifference(
  checkoutStartedAt: number,
  orderCreatedAt: number,
): string {
  const totalMinutes = Math.max(0, Math.round((orderCreatedAt - checkoutStartedAt) / 60));
  if (totalMinutes < 60) return `${totalMinutes} min${totalMinutes === 1 ? "" : "s"} after checkout start`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h${minutes ? ` ${minutes}m` : ""} after checkout start`;
}
