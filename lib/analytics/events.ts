"use client";

import { sendGoogleEvent } from "@/lib/analytics/google";
import type { Cart, CartAddLine, CartLine } from "@/types/cart";
import type { Product, ProductVariant, SelectedOption } from "@/types/product";
import { moneyAmountToMinorUnits } from "@/lib/shopify/pricing";
import { trackAnalyticsEvent, type AnalyticsSourceSurface } from "@/lib/analytics/first-party";

export interface CartAnalyticsContext {
  sourceSurface: AnalyticsSourceSurface;
  properties?: Record<string, unknown>;
}

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
  trackAnalyticsEvent({
    eventName: "product_view",
    pagePath: window.location.pathname,
    pageType: "product",
    sourceSurface: "product_page",
    productId: product.id,
    productHandle: product.handle,
    variantId: variant?.id,
    sku: variant?.productCode,
  }, { dedupeKey: `product-view:${product.id ?? product.handle ?? product.title}` });
}

export function trackSearch(searchTerm: string, resultCount?: number, sourceSurface: "header_search" | "search_results" = "search_results") {
  const normalized = searchTerm.trim();
  if (!normalized) return;
  sendGoogleEvent("search", { search_term: normalized });
  if (resultCount !== undefined) trackAnalyticsEvent({
    eventName: "search_performed",
    pagePath: window.location.pathname,
    pageType: "search",
    sourceSurface,
    properties: { query: normalized.slice(0, 200), result_count: resultCount },
  });
}

export function trackAddToCart(cart: Cart, addedLines: CartAddLine[], context: CartAnalyticsContext) {
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
  for (const requested of quantities.values()) {
    const line = cart.lines.find((candidate) => candidate.merchandise.id === requested.merchandiseId
      && candidate.sellingPlanAllocation?.sellingPlan.id === requested.sellingPlanId);
    if (!line) continue;
    const lineMinor = moneyAmountToMinorUnits(line.cost.totalAmount.amount);
    const valueMinor = lineMinor === undefined || line.quantity < 1
      ? undefined : Math.floor((lineMinor * requested.quantity) / line.quantity);
    const sellingPlan = line.sellingPlanAllocation?.sellingPlan;
    trackAnalyticsEvent({
      eventName: "add_to_cart",
      pagePath: window.location.pathname,
      sourceSurface: context.sourceSurface,
      productId: line.merchandise.product.id,
      productHandle: line.merchandise.product.handle,
      variantId: line.merchandise.id,
      sku: line.merchandise.productCode,
      quantity: requested.quantity,
      valueMinor,
      currency: line.cost.totalAmount.currencyCode,
      properties: {
        purchase_type: sellingPlan ? "subscription" : "one_time",
        ...(sellingPlan ? { selling_plan_id: sellingPlan.id, selling_plan_name: sellingPlan.name } : {}),
        ...context.properties,
      },
    });
  }
}

export function trackRemoveFromCart(line: CartLine, sourceSurface: "cart_drawer" | "cart_page") {
  const item = cartLineItem(line);
  sendGoogleEvent("remove_from_cart", {
    currency: line.cost.totalAmount.currencyCode || "GBP",
    value: itemValue([item]),
    items: [item],
  });
  trackAnalyticsEvent({
    eventName: "remove_from_cart", pagePath: window.location.pathname, sourceSurface,
    productId: line.merchandise.product.id,
    productHandle: line.merchandise.product.handle, variantId: line.merchandise.id,
    sku: line.merchandise.productCode, quantity: line.quantity,
    valueMinor: moneyAmountToMinorUnits(line.cost.totalAmount.amount), currency: line.cost.totalAmount.currencyCode,
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
  trackAnalyticsEvent({
    eventName: "cart_opened", pagePath: window.location.pathname, sourceSurface: "cart_drawer",
    quantity: cart.totalQuantity, valueMinor: moneyAmountToMinorUnits(cart.cost.totalAmount.amount),
    currency: currencyFromCart(cart),
  });
}

export function trackPwaPromptShown(platform: "chromium" | "ios") {
  sendGoogleEvent("pwa_install_prompt_shown", { platform });
  trackAnalyticsEvent({ eventName: "pwa_install_prompt_shown", sourceSurface: "site", properties: { platform } }, { dedupeKey: `pwa-prompt:${platform}` });
}

export function trackPwaInstallClicked(platform: "chromium" | "ios") {
  sendGoogleEvent("pwa_install_clicked", { platform });
  trackAnalyticsEvent({ eventName: "pwa_install_clicked", sourceSurface: "site", properties: { platform } });
}

export function trackPwaInstalled() {
  sendGoogleEvent("pwa_installed", { platform: "chromium" });
  trackAnalyticsEvent({ eventName: "pwa_installed", sourceSurface: "site", properties: { platform: "chromium" } });
}

export function trackPwaInstallDismissed(source: "not_now" | "native_prompt") {
  sendGoogleEvent("pwa_install_dismissed", { source });
  trackAnalyticsEvent({ eventName: "pwa_install_dismissed", sourceSurface: "site", properties: { source } });
}

export function trackPwaLaunchedStandalone() {
  sendGoogleEvent("pwa_launched_standalone", {});
  trackAnalyticsEvent({ eventName: "pwa_launched_standalone", sourceSurface: "site" }, { dedupeKey: "pwa-standalone-launch" });
}
