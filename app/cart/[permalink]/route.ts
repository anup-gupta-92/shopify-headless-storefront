import { type NextRequest, NextResponse } from "next/server";
import { CartOperationError, cartCreate, getPurchasableVariantIds } from "@/lib/shopify/cart";
import { getBuyerIp, setCartCookie } from "@/lib/shopify/cart-http";
import {
  cartPermalinkContext,
  cartPermalinkWasFullyCreated,
  parseCartPermalink,
  purchasableCartPermalinkLines,
} from "@/lib/shopify/cart-permalink";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function cartRedirect(request: NextRequest, result?: "invalid" | "partial" | "unavailable" | "error") {
  const destination = new URL("/cart", request.url);
  if (result) destination.searchParams.set("buy_again", result);
  return NextResponse.redirect(destination, { status: 303, headers: noStoreHeaders });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ permalink: string }> },
) {
  const lines = parseCartPermalink((await params).permalink);
  if (!lines) return cartRedirect(request, "invalid");

  try {
    const buyerIp = getBuyerIp(request);
    const purchasableIds = await getPurchasableVariantIds(
      lines.map(({ merchandiseId }) => merchandiseId),
      buyerIp,
    );
    const purchasable = purchasableCartPermalinkLines(lines, purchasableIds);
    if (!purchasable.lines.length) return cartRedirect(request, "unavailable");

    // A Shopify cart permalink describes a newly preloaded cart. Creating a
    // fresh cart avoids unexpectedly merging a previous, unrelated basket.
    const cart = await cartCreate(
      purchasable.lines,
      buyerIp,
      cartPermalinkContext(request.nextUrl.searchParams),
    );
    if (!cart.lines.nodes.length) return cartRedirect(request, "unavailable");

    const createdLines = cart.lines.nodes.map((line) => ({
      merchandiseId: line.merchandise.id,
      quantity: line.quantity,
    }));
    const complete = purchasable.omittedCount === 0
      && cartPermalinkWasFullyCreated(lines, createdLines);
    const response = cartRedirect(request, complete ? undefined : "partial");
    setCartCookie(response, cart.id);
    return response;
  } catch (error) {
    return cartRedirect(request, error instanceof CartOperationError ? "unavailable" : "error");
  }
}
