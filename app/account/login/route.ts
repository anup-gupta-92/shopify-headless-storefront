import { NextRequest, NextResponse } from "next/server";
import { getCustomerAccountClientId } from "@/lib/shopify/config";
import { getOpenIdConfiguration } from "@/lib/shopify/customer-account/discovery";
import {
  createCodeChallenge,
  CUSTOMER_ACCOUNT_SCOPES,
  randomBase64Url,
} from "@/lib/shopify/customer-account/oauth";
import { clearPendingOAuth, setPendingOAuth } from "@/lib/shopify/customer-account/session";
import { isCustomerAccountFixtureEnabled } from "@/lib/shopify/customer-account/development-fixtures";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  if (isCustomerAccountFixtureEnabled()) {
    return NextResponse.redirect(new URL("/account", origin));
  }
  const redirectUri = `${origin}/account/authorize`;

  try {
    const configuration = await getOpenIdConfiguration();
    const codeVerifier = randomBase64Url(48);
    const state = randomBase64Url();
    const nonce = randomBase64Url();
    const authorizationUrl = new URL(configuration.authorization_endpoint);
    authorizationUrl.search = new URLSearchParams({
      client_id: getCustomerAccountClientId(),
      response_type: "code",
      redirect_uri: redirectUri,
      scope: CUSTOMER_ACCOUNT_SCOPES,
      state,
      nonce,
      code_challenge: createCodeChallenge(codeVerifier),
      code_challenge_method: "S256",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    setPendingOAuth(response, {
      state,
      nonce,
      codeVerifier,
      redirectUri,
      createdAt: Date.now(),
    });
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/account/error?reason=unavailable", origin));
    clearPendingOAuth(response);
    return response;
  }
}
