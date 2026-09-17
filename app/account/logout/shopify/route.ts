import { NextRequest, NextResponse } from "next/server";
import { getOpenIdConfiguration } from "@/lib/shopify/customer-account/discovery";
import {
  clearCustomerSession,
  clearLogoutHandoff,
  clearPendingOAuth,
  readLogoutHandoff,
} from "@/lib/shopify/customer-account/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const idToken = await readLogoutHandoff();
  let destination = new URL("/", origin);

  if (idToken) {
    try {
      const configuration = await getOpenIdConfiguration();
      const logoutUrl = new URL(configuration.end_session_endpoint);
      logoutUrl.searchParams.set("id_token_hint", idToken);
      logoutUrl.searchParams.set("post_logout_redirect_uri", `${origin}/`);
      destination = logoutUrl;
    } catch {
      // The local session is already gone; return home if Shopify is unavailable.
    }
  }

  const response = NextResponse.redirect(destination);
  clearCustomerSession(response);
  clearPendingOAuth(response);
  clearLogoutHandoff(response);
  return response;
}
