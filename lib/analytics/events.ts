"use client";

import { sendGoogleEvent } from "@/lib/analytics/google";
import type { Cart, CartAddLine, CartLine } from "@/types/cart";
import type { Product, ProductVariant, SelectedOption } from "@/types/product";

export interface GoogleAnalyticsItem {
  item_id: string;
  item_name: string;
  item_brand?: string;
  item_category?: string;
  item_variant?: string;
  price?: number;
  quantity: number;
}

function numericAmount(value: string | undefined): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

function optionalText(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function variantDescription(selectedOptions: SelectedOption[] | undefined, fallback?: string) {
  const options = (selectedOptions ?? [])
    .filter(({ name, value }) => !(name === "Title" && value === "Default Title"))
    .map(({ name, value }) => `${name}: ${value}`);
  return optionalText(options.length ? options.join(" · ") : fallback);
}

function cartLineItem(line: CartLine, quantity = line.quantity): GoogleAnalyticsItem {
  const lineTotal = numericAmount(line.cost.totalAmount.amount);
  const price = lineTotal !== null && line.quantity > 0 ? lineTotal / line.quantity : undefined;
  return {
    item_id: line.merchandise.id,
    item_name: line.merchandise.product.title,
    item_brand: optionalText(line.merchandise.product.vendor),
    item_category: optionalText(line.merchandise.product.category),
    item_variant: variantDescription(line.merchandise.selectedOptions, line.merchandise.title),
    price,
    quantity,
  };
}

function itemValue(items: GoogleAnalyticsItem[]) {
  const value = items.reduce((total, item) => total + (item.price ?? 0) * item.quantity, 0);
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function currencyFromCart(cart: Cart) {
  return cart.cost.totalAmount.currencyCode || cart.cost.subtotalAmount.currencyCode || "GBP";
}

export function trackPageView(path: string) {
  sendGoogleEvent("page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
  });
}

export function trackViewItem(product: Product, variant: ProductVariant | undefined) {
  const price = numericAmount(variant?.money?.amount);
  const item: GoogleAnalyticsItem = {
    item_id: variant?.id ?? product.id ?? product.handle ?? product.title,
    item_name: product.title,
    item_brand: optionalText(product.vendor),
    item_category: optionalText(product.category),
    item_variant: variantDescription(variant?.selectedOptions, variant?.title),
    price: price ?? undefined,
    quantity: 1,
  };
  sendGoogleEvent("view_item", {
    currency: variant?.money?.currencyCode ?? product.currencyCode ?? "GBP",
    ...(price !== null ? { value: price } : {}),
    items: [item],
  });
}

export function trackSearch(searchTerm: string) {
  const normalized = searchTerm.trim();
  if (!normalized) return;
  sendGoogleEvent("search", { search_term: normalized });
}

export function trackAddToCart(cart: Cart, addedLines: CartAddLine[]) {
  const quantities = new Map<string, CartAddLine>();
  for (const line of addedLines) {
    const key = `${line.merchandiseId}\0${line.sellingPlanId ?? ""}`;
    quantities.set(key, {
      ...line,
      quantity: (quantities.get(key)?.quantity ?? 0) + line.quantity,
    });
  }
  const items = [...quantities.values()].flatMap(({ merchandiseId, quantity, sellingPlanId }) => {
    const line = cart.lines.find((candidate) =>
      candidate.merchandise.id === merchandiseId
      && candidate.sellingPlanAllocation?.sellingPlan.id === sellingPlanId,
    );
    return line ? [cartLineItem(line, quantity)] : [];
  });
  if (!items.length) return;
  sendGoogleEvent("add_to_cart", {
    currency: currencyFromCart(cart),
    value: itemValue(items),
    items,
  });
}

export function trackRemoveFromCart(line: CartLine) {
  const item = cartLineItem(line);
  sendGoogleEvent("remove_from_cart", {
    currency: line.cost.totalAmount.currencyCode || "GBP",
    value: itemValue([item]),
    items: [item],
  });
}

export function trackViewCart(cart: Cart) {
  if (!cart.lines.length) return;
  const value = numericAmount(cart.cost.totalAmount.amount);
  sendGoogleEvent("view_cart", {
    currency: currencyFromCart(cart),
    ...(value !== null ? { value } : {}),
    items: cart.lines.map((line) => cartLineItem(line)),
  });
}
