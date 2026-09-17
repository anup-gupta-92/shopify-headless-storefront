import { NextRequest, NextResponse } from "next/server";
import {
  exchangeAuthorizationCode,
  safeEqual,
  verifyIdToken,
} from "@/lib/shopify/customer-account/oauth";
import {
  clearPendingOAuth,
  readPendingOAuth,
  setCustomerSession,
} from "@/lib/shopify/customer-account/session";

export const dynamic = "force-dynamic";

function failure(request: NextRequest, reason: "cancelled" | "invalid" | "failed") {
  const response = NextResponse.redirect(new URL(`/account/error?reason=${reason}`, request.nextUrl.origin));
  clearPendingOAuth(response);
  return response;
}

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state");
  const pending = await readPendingOAuth();
  if (!state || !pending || !safeEqual(state, pending.state)) {
    return failure(request, "invalid");
  }

  const error = request.nextUrl.searchParams.get("error");
  if (error) return failure(request, error === "access_denied" ? "cancelled" : "failed");

  const code = request.nextUrl.searchParams.get("code");
  if (!code) return failure(request, "invalid");

  try {
    const token = await exchangeAuthorizationCode({
      code,
      codeVerifier: pending.codeVerifier,
      redirectUri: pending.redirectUri,
      origin: request.nextUrl.origin,
    });
    await verifyIdToken(token.idToken, pending.nonce);

    const response = NextResponse.redirect(new URL("/account", request.nextUrl.origin));
    clearPendingOAuth(response);
    setCustomerSession(response, {
      accessToken: token.accessToken,
      expiresAt: Math.floor(Date.now() / 1000) + token.expiresIn,
      idToken: token.idToken,
      refreshToken: token.refreshToken,
    });
    return response;
  } catch {
    return failure(request, "failed");
  }
}
