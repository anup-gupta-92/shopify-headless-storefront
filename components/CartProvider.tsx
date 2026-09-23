"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Cart, CartAddLine } from "@/types/cart";

interface CartContextValue {
  cart: Cart | null;
  totalQuantity: number;
  loading: boolean;
  checkoutLoading: boolean;
  drawerOpen: boolean;
  error: string | null;
  addItem: (merchandiseId: string, quantity: number) => Promise<void>;
  addLines: (lines: CartAddLine[], options?: { openDrawer?: boolean }) => Promise<void>;
  updateLine: (lineId: string, quantity: number) => Promise<void>;
  removeLine: (lineId: string) => Promise<void>;
  refreshCart: () => Promise<void>;
  prepareCheckout: () => Promise<string>;
  openDrawer: () => void;
  closeDrawer: () => void;
  clearError: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

async function readCartResponse(response: Response): Promise<Cart | null> {
  const body = await response.json().catch(() => null) as { cart?: Cart | null; error?: string } | null;
  if (!response.ok) throw new Error(body?.error || "Your cart could not be updated. Please try again.");
  return body?.cart ?? null;
}

async function fetchCurrentCart(): Promise<Cart | null> {
  const response = await fetch("/api/cart", { cache: "no-store", credentials: "same-origin" });
  return readCartResponse(response);
}

function validCheckoutUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export default function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mutationInFlight = useRef(false);
  const checkoutInFlight = useRef(false);

  const refreshCart = useCallback(async () => {
    try {
      setCart(await fetchCurrentCart());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your cart is temporarily unavailable.");
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchCurrentCart()
      .then((nextCart) => {
        if (!active) return;
        setCart(nextCart);
        setError(null);
      })
      .catch((reason) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Your cart is temporarily unavailable.");
      })
      .finally(() => {
        if (active) setInitializing(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const mutate = useCallback(async (payload: Record<string, unknown>) => {
    if (mutationInFlight.current) throw new Error("Please wait for the current cart update to finish.");
    mutationInFlight.current = true;
    setMutating(true);
    setError(null);

    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const nextCart = await readCartResponse(response);
      setCart(nextCart);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Your cart could not be updated. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  }, []);

  const addItem = useCallback(async (merchandiseId: string, quantity: number) => {
    await mutate({ action: "add", merchandiseId, quantity });
    setDrawerOpen(true);
  }, [mutate]);

  const addLines = useCallback(async (
    lines: CartAddLine[],
    options: { openDrawer?: boolean } = {},
  ) => {
    await mutate({ action: "addLines", lines });
    if (options.openDrawer !== false) setDrawerOpen(true);
  }, [mutate]);

  const updateLine = useCallback(async (lineId: string, quantity: number) => {
    await mutate({ action: "update", lineId, quantity });
  }, [mutate]);

  const removeLine = useCallback(async (lineId: string) => {
    await mutate({ action: "remove", lineId });
  }, [mutate]);

  const prepareCheckout = useCallback(async () => {
    if (checkoutInFlight.current || mutationInFlight.current) {
      throw new Error("Please wait for the current cart request to finish.");
    }
    checkoutInFlight.current = true;
    setCheckoutLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/cart/checkout", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
      });
      const body = await response.json().catch(() => null) as { checkoutUrl?: unknown; error?: string } | null;
      if (!response.ok) {
        if (response.status === 409 || response.status === 410) setCart(null);
        throw new Error(body?.error || "Checkout is temporarily unavailable. Please try again.");
      }
      if (!validCheckoutUrl(body?.checkoutUrl)) throw new Error("Checkout is temporarily unavailable. Please try again.");
      return body.checkoutUrl;
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Checkout is temporarily unavailable. Please try again.";
      setError(message);
      throw new Error(message);
    } finally {
      checkoutInFlight.current = false;
      setCheckoutLoading(false);
    }
  }, []);

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const clearError = useCallback(() => setError(null), []);

  const value: CartContextValue = {
    cart,
    totalQuantity: cart?.totalQuantity ?? 0,
    loading: initializing || mutating || checkoutLoading,
    checkoutLoading,
    drawerOpen,
    error,
    addItem,
    addLines,
    updateLine,
    removeLine,
    refreshCart,
    prepareCheckout,
    openDrawer,
    closeDrawer,
    clearError,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
