import { NextRequest, NextResponse } from "next/server";
import { getOpenIdConfiguration } from "@/lib/shopify/customer-account/discovery";
import {
  clearCustomerSession,
  clearPendingOAuth,
  readCustomerSession,
} from "@/lib/shopify/customer-account/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const session = await readCustomerSession();
  let destination = new URL("/", origin);

  if (session?.idToken) {
    try {
      const configuration = await getOpenIdConfiguration();
      const logoutUrl = new URL(configuration.end_session_endpoint);
      logoutUrl.searchParams.set("id_token_hint", session.idToken);
      logoutUrl.searchParams.set("post_logout_redirect_uri", `${origin}/`);
      destination = logoutUrl;
    } catch {
      // Always terminate the local session even if Shopify logout is unavailable.
    }
  }

  const response = NextResponse.redirect(destination);
  clearCustomerSession(response);
  clearPendingOAuth(response);
  return response;
}
