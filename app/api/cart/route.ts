import { isIP } from "node:net";
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

const CART_COOKIE = "apex_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CART_ID_PREFIX = "gid://shopify/Cart/";
const VARIANT_ID_PREFIX = "gid://shopify/ProductVariant/";
const LINE_ID_PREFIX = "gid://shopify/CartLine/";

function buyerIp(request: NextRequest): string | undefined {
  if (!process.env.VERCEL) return undefined;
  const raw = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  const candidate = raw?.split(",")[0].trim();
  return candidate && isIP(candidate) ? candidate : undefined;
}

function validCartId(value: string | undefined): value is string {
  return Boolean(value?.startsWith(CART_ID_PREFIX) && value.includes("?key="));
}

function positiveQuantity(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 999;
}

function setCartCookie(response: NextResponse, cartId: string) {
  response.cookies.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

function clearCartCookie(response: NextResponse) {
  response.cookies.set(CART_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
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
    const cart = await getCart(cartId, buyerIp(request));
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
  const ip = buyerIp(request);
  const savedCartId = request.cookies.get(CART_COOKIE)?.value;
  const cartId = validCartId(savedCartId) ? savedCartId : undefined;

  try {
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
