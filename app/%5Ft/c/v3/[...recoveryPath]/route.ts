import { checkoutRecoveryRedirect } from "@/lib/shopify/checkout-recovery";
import { getShopifyStoreDomain } from "@/lib/shopify/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET(request: Request) {
  try {
    // Let Shopify consume the opaque token in the browser so its recovery
    // cookies and any subsequent checkout redirect remain Shopify-owned.
    return checkoutRecoveryRedirect(getShopifyStoreDomain(), request.url);
  } catch {
    return Response.json(
      { error: "Checkout recovery is temporarily unavailable." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
