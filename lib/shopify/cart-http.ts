import "server-only";

import { isIP } from "node:net";
import type { NextRequest, NextResponse } from "next/server";

export const CART_COOKIE = "apex_cart";
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
const CART_ID_PREFIX = "gid://shopify/Cart/";

export function getBuyerIp(request: NextRequest): string | undefined {
  if (!process.env.VERCEL) return undefined;
  const raw = request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("x-forwarded-for");
  const candidate = raw?.split(",")[0].trim();
  return candidate && isIP(candidate) ? candidate : undefined;
}

export function validCartId(value: string | undefined): value is string {
  return Boolean(value?.startsWith(CART_ID_PREFIX) && value.includes("?key="));
}

export function setCartCookie(response: NextResponse, cartId: string): void {
  response.cookies.set(CART_COOKIE, cartId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
}

export function clearCartCookie(response: NextResponse): void {
  response.cookies.set(CART_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
}
