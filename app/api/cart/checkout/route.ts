import { type NextRequest, NextResponse } from "next/server";
import { CartOperationError, getAuthenticatedCartForCheckout, getCartForCheckout } from "@/lib/shopify/cart";
import { CART_COOKIE, clearCartCookie, getBuyerIp, validCartId } from "@/lib/shopify/cart-http";
import { customerSessionNeedsRefresh, readCustomerSession } from "@/lib/shopify/customer-account/session";

const responseHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(message: string, status: number, clearCookie = false) {
  const response = NextResponse.json({ error: message }, { status, headers: responseHeaders });
  if (clearCookie) clearCartCookie(response);
  return response;
}

function safeCheckoutUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const savedCartId = request.cookies.get(CART_COOKIE)?.value;
  if (!validCartId(savedCartId)) {
    return errorResponse("Your cart has expired. Please add your items again.", 410, Boolean(savedCartId));
  }

  try {
    const buyerIp = getBuyerIp(request);
    const customerSession = await readCustomerSession();
    let cart;

    // checkoutUrl is intentionally fetched at click time. Shopify can refresh a
    // stale checkout session while resolving the current cart. A valid Customer
    // Account API token stays server-side and is associated with this cart using
    // Shopify's supported buyer-identity mutation. A rejected/expired identity
    // falls back to guest-compatible checkout rather than blocking the buyer.
    if (customerSession && !customerSessionNeedsRefresh(customerSession)) {
      try {
        cart = await getAuthenticatedCartForCheckout(savedCartId, customerSession.accessToken, buyerIp);
      } catch (error) {
        if (!(error instanceof CartOperationError)) throw error;
        cart = await getCartForCheckout(savedCartId, buyerIp);
      }
    } else {
      cart = await getCartForCheckout(savedCartId, buyerIp);
    }

    if (!cart) return errorResponse("Your cart has expired. Please add your items again.", 410, true);
    if (cart.totalQuantity < 1 || cart.lines.nodes.length < 1) {
      return errorResponse("Your cart is empty.", 409);
    }

    const checkoutUrl = safeCheckoutUrl(cart.checkoutUrl);
    if (!checkoutUrl) return errorResponse("Checkout is temporarily unavailable. Please try again.", 503);
    return NextResponse.json({ checkoutUrl }, { headers: responseHeaders });
  } catch {
    return errorResponse("Checkout is temporarily unavailable. Please try again.", 503);
  }
}
