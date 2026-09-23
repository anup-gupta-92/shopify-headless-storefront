import { type NextRequest, NextResponse } from "next/server";
import {
  CartOperationError,
  cartCreate,
  cartLinesAdd,
  cartLinesRemove,
  cartLinesUpdate,
  getCart,
  toPublicCart,
} from "@/lib/shopify/cart";
import {
  CART_COOKIE,
  clearCartCookie,
  getBuyerIp,
  setCartCookie,
  validCartId,
} from "@/lib/shopify/cart-http";

const VARIANT_ID_PREFIX = "gid://shopify/ProductVariant/";
const LINE_ID_PREFIX = "gid://shopify/CartLine/";
const MAX_BULK_LINES = 250;

function positiveQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 999;
}

function validAddLines(value: unknown): Array<{ merchandiseId: string; quantity: number }> | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_BULK_LINES) return null;
  const quantities = new Map<string, number>();
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const line = candidate as Record<string, unknown>;
    if (typeof line.merchandiseId !== "string" || !line.merchandiseId.startsWith(VARIANT_ID_PREFIX) || !positiveQuantity(line.quantity)) return null;
    const quantity = (quantities.get(line.merchandiseId) ?? 0) + line.quantity;
    if (!positiveQuantity(quantity)) return null;
    quantities.set(line.merchandiseId, quantity);
  }
  return [...quantities].map(([merchandiseId, quantity]) => ({ merchandiseId, quantity }));
}

function cartResponse(cart: Awaited<ReturnType<typeof getCart>>) {
  return NextResponse.json({ cart: cart ? toPublicCart(cart) : null }, {
    headers: { "Cache-Control": "no-store" },
  });
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(request: NextRequest) {
  const cartId = request.cookies.get(CART_COOKIE)?.value;
  if (!validCartId(cartId)) {
    const response = cartResponse(null);
    if (cartId) clearCartCookie(response);
    return response;
  }

  try {
    const cart = await getCart(cartId, getBuyerIp(request));
    const response = cartResponse(cart);
    if (!cart) clearCartCookie(response);
    return response;
  } catch {
    return errorResponse("Your cart is temporarily unavailable. Please try again.", 503);
  }
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid cart request.");
  }

  if (!body || typeof body !== "object" || !("action" in body)) return errorResponse("Invalid cart request.");

  const input = body as Record<string, unknown>;
  const action = input.action;
  const ip = getBuyerIp(request);
  const savedCartId = request.cookies.get(CART_COOKIE)?.value;
  const cartId = validCartId(savedCartId) ? savedCartId : undefined;

  try {
    if (action === "addLines") {
      const lines = validAddLines(input.lines);
      if (!lines) return errorResponse("Please choose available product options and valid quantities.");

      const currentCart = cartId ? await getCart(cartId, ip) : null;
      if (!currentCart) {
        const created = await cartCreate(lines, ip);
        const response = cartResponse(created);
        setCartCookie(response, created.id);
        return response;
      }

      // Shopify accepts all CartLineInput values in one mutation and merges
      // matching merchandise lines in the authoritative cart response.
      return cartResponse(await cartLinesAdd(cartId!, lines, ip));
    }

    if (action === "add") {
      if (typeof input.merchandiseId !== "string" || !input.merchandiseId.startsWith(VARIANT_ID_PREFIX) || !positiveQuantity(input.quantity)) {
        return errorResponse("Please choose an available product option and a valid quantity.");
      }

      let currentCart = cartId ? await getCart(cartId, ip) : null;
      if (!currentCart) {
        const created = await cartCreate([{ merchandiseId: input.merchandiseId, quantity: input.quantity }], ip);
        const response = cartResponse(created);
        setCartCookie(response, created.id);
        return response;
      }

      const existingLine = currentCart.lines.nodes.find((line) => line.merchandise.id === input.merchandiseId);
      currentCart = existingLine
        ? await cartLinesUpdate(cartId!, [{ id: existingLine.id, quantity: existingLine.quantity + input.quantity }], ip)
        : await cartLinesAdd(cartId!, [{ merchandiseId: input.merchandiseId, quantity: input.quantity }], ip);
      return cartResponse(currentCart);
    }

    if (!cartId) return cartResponse(null);

    const currentCart = await getCart(cartId, ip);
    if (!currentCart) {
      const response = cartResponse(null);
      clearCartCookie(response);
      return response;
    }

    if (action === "update") {
      if (typeof input.lineId !== "string" || !input.lineId.startsWith(LINE_ID_PREFIX) || !positiveQuantity(input.quantity)) {
        return errorResponse("Please choose a valid cart quantity.");
      }
      if (!currentCart.lines.nodes.some((line) => line.id === input.lineId)) return cartResponse(currentCart);
      return cartResponse(await cartLinesUpdate(cartId, [{ id: input.lineId, quantity: input.quantity }], ip));
    }

    if (action === "remove") {
      if (typeof input.lineId !== "string" || !input.lineId.startsWith(LINE_ID_PREFIX)) return errorResponse("Invalid cart line.");
      if (!currentCart.lines.nodes.some((line) => line.id === input.lineId)) return cartResponse(currentCart);
      return cartResponse(await cartLinesRemove(cartId, [input.lineId], ip));
    }

    return errorResponse("Unsupported cart action.");
  } catch (error) {
    if (error instanceof CartOperationError) return errorResponse(error.publicMessage, 422);
    return errorResponse("Your cart could not be updated. Please try again.", 503);
  }
}
